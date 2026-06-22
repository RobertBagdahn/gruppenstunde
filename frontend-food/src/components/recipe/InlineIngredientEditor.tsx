/**
 * InlineIngredientEditor — Edit-Mode for recipe ingredients on the detail page.
 * Allows editing quantities, units, notes, adding/removing items, and AI estimation.
 */
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, SlidersHorizontal } from 'lucide-react';
import {
  useUpdateRecipe,
  useUpdateRecipeItem,
  useDeleteRecipeItem,
  useCreateRecipeItem,
  useEstimateQuantities,
} from '@/api/recipes';
import { IngredientAutocomplete } from './IngredientAutocomplete';
import IngredientDetailSearchDialog from './IngredientDetailSearchDialog';
import type { RecipeItem } from '@/schemas/recipe';
import type { EstimateQuantityItem } from '@/schemas/recipe';

// --- Types ---

interface EditableItem {
  id: number;
  portion_id: number;
  ingredient_id: number | null;
  ingredient_name: string;
  quantity: number;
  /** Raw input string while the user is typing — allows empty/partial input */
  quantityInput: string;
  measuring_unit_name: string | null;
  note: string;
  sort_order: number;
  ingredient_portions: { id: number; name: string; weight_g: number | null; measuring_unit_name: string | null; is_default: boolean; priority?: number | null }[];
  isNew?: boolean;
  isDeleted?: boolean;
  isDirty?: boolean;
}

interface AiIngredientSuggestion {
  ingredient_id: number;
  ingredient_name: string;
  portion_id: number;
  portion_name: string;
  quantity: number;
  is_new_ingredient: boolean;
}

interface InlineIngredientEditorProps {
  recipeId: number;
  items: RecipeItem[];
  portions: number | null;
  onClose: () => void;
  onSaved: () => void;
}

// --- Helpers ---

/** Normalize items to per-1-serving quantities in grams.
 *  Converts portion-based quantities to grams for editing,
 *  and switches to the base (is_default) portion. */
function normalizeItems(items: RecipeItem[], portions: number | null): EditableItem[] {
  const s = portions ?? 1;
  return items.map((item) => {
    // Find the weight_g of the current portion
    const currentPortion = item.ingredient_portions?.find((p) => p.id === item.portion_id);
    const portionWeightG = currentPortion?.weight_g ?? 1;

    // Convert to grams: quantity × portion.weight_g
    const quantityInGrams = item.quantity * portionWeightG;
    const normalizedQty = s > 1 ? Math.round((quantityInGrams / s) * 100) / 100 : quantityInGrams;

    // Use the base (default) portion for editing (weight_g ≈ 1)
    const basePortion = item.ingredient_portions?.find((p) => p.is_default) ?? currentPortion;
    const basePortionId = basePortion?.id ?? item.portion_id;
    const basePortionWeightG = basePortion?.weight_g ?? 1;

    // Quantity as multiplier on the base portion
    const quantityForBasePortion = normalizedQty / basePortionWeightG;

    const qty = Math.round(quantityForBasePortion * 100) / 100;
    return {
      id: item.id,
      portion_id: basePortionId,
      ingredient_id: item.ingredient_id ?? null,
      ingredient_name: item.ingredient_name,
      quantity: qty,
      quantityInput: String(qty),
      measuring_unit_name: basePortion?.measuring_unit_name ?? 'g',
      note: item.note,
      sort_order: item.sort_order,
      ingredient_portions: (item.ingredient_portions ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        weight_g: p.weight_g,
        measuring_unit_name: p.measuring_unit_name,
        is_default: p.is_default,
        priority: p.priority,
      })),
      isDirty: s > 1 || basePortionId !== item.portion_id,
    };
  });
}

// --- Component ---

export default function InlineIngredientEditor({
  recipeId,
  items,
  portions,
  onClose,
  onSaved,
}: InlineIngredientEditorProps) {
  const [editItems, setEditItems] = useState<EditableItem[]>(() =>
    normalizeItems(items, portions),
  );
  const [showEstimate, setShowEstimate] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [estimateResult, setEstimateResult] = useState<EstimateQuantityItem[] | null>(null);
  const [selectedEstimates, setSelectedEstimates] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiIngredientSuggestion[] | null>(null);
  const [selectedAiSuggestions, setSelectedAiSuggestions] = useState<Set<number>>(new Set());
  const [detailSearchOpen, setDetailSearchOpen] = useState(false);

  const queryClient = useQueryClient();

  const updateRecipe = useUpdateRecipe(recipeId);
  const updateItem = useUpdateRecipeItem(recipeId);
  const deleteItem = useDeleteRecipeItem(recipeId);
  const createItem = useCreateRecipeItem(recipeId);
  const estimateQuantities = useEstimateQuantities(recipeId);

  // --- Handlers ---

  // Handles raw string input — allows empty/partial values while typing.
  // The numeric quantity is only updated when the input is a valid number.
  const handleQuantityInputChange = useCallback((id: number, raw: string) => {
    // Allow empty string, digits, dot and comma as decimal separator
    const sanitized = raw.replace(',', '.');
    const parsed = parseFloat(sanitized);
    const isValid = sanitized !== '' && !isNaN(parsed) && parsed > 0;
    setEditItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, quantityInput: raw, quantity: isValid ? parsed : item.quantity, isDirty: true }
          : item,
      ),
    );
  }, []);

  // Commits the input on blur — resets to current numeric value if input is empty/invalid
  const handleQuantityBlur = useCallback((id: number) => {
    setEditItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const sanitized = item.quantityInput.replace(',', '.');
        const parsed = parseFloat(sanitized);
        const valid = sanitized !== '' && !isNaN(parsed) && parsed > 0;
        return { ...item, quantityInput: String(valid ? parsed : item.quantity) };
      }),
    );
  }, []);

  const handleNoteChange = useCallback((id: number, note: string) => {
    setEditItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note, isDirty: true } : item)),
    );
  }, []);

  const handlePortionChange = useCallback((id: number, portionId: number) => {
    setEditItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const oldPortion = item.ingredient_portions.find((p) => p.id === item.portion_id);
        const newPortion = item.ingredient_portions.find((p) => p.id === portionId);
        if (!newPortion) return item;

        // Convert quantity: old quantity in grams → new unit
        const oldWeightG = oldPortion?.weight_g ?? 1;
        const newWeightG = newPortion.weight_g ?? 1;
        const quantityInGrams = item.quantity * oldWeightG;
        const newQuantity = Math.round((quantityInGrams / newWeightG) * 100) / 100;

        return {
          ...item,
          portion_id: portionId,
          measuring_unit_name: newPortion.measuring_unit_name ?? newPortion.name,
          quantity: newQuantity,
          quantityInput: String(newQuantity),
          isDirty: true,
        };
      }),
    );
  }, []);

  const handleDelete = useCallback((id: number) => {
    setEditItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isDeleted: true } : item)),
    );
  }, []);

  const handleAddIngredient = useCallback(
    async (ingredient: { id: number; name: string; slug: string }) => {
      const maxSort = editItems.reduce((max, i) => Math.max(max, i.sort_order), 0);

      // Ingredients without a slug have not been created yet.
      // The UnknownIngredientDialog handles navigation to /ingredients/new.
      if (!ingredient.slug) return;

      // Fetch portions for this ingredient and select smart default
      try {
        const res = await fetch(`/api/ingredients/${ingredient.slug}/portions/`, { credentials: 'include' });
        const portions = await res.json();

        // Smart default: highest-priority portion with weight_g > 0 (4.1, 4.3)
        const bestPortion = [...portions]
          .filter((p: { weight_g: number | null }) => (p.weight_g ?? 0) > 0)
          .sort((a: { priority?: number | null }, b: { priority?: number | null }) => (b.priority ?? 0) - (a.priority ?? 0))[0]
          ?? portions[0];

        if (!bestPortion) {
          toast.error('Keine Portion für diese Zutat gefunden');
          return;
        }

        setEditItems((prev) => [
          ...prev,
          {
            id: -Date.now(),
            portion_id: bestPortion.id,
            ingredient_id: ingredient.id,
            ingredient_name: ingredient.name,
            quantity: 1, // (4.2) start with 1, not 0
            quantityInput: '1',
            measuring_unit_name: bestPortion.measuring_unit_name || bestPortion.name || 'g', // (4.3)
            note: '',
            sort_order: maxSort + 1,
            ingredient_portions: portions.map((p: { id: number; name: string; weight_g: number | null; measuring_unit_name: string | null; is_default: boolean; priority?: number | null }) => ({
              id: p.id,
              name: p.name,
              weight_g: p.weight_g,
              measuring_unit_name: p.measuring_unit_name,
              is_default: p.is_default,
              priority: p.priority,
            })),
            isNew: true,
            isDirty: true,
          },
        ]);
      } catch {
        toast.error('Fehler beim Laden der Portion');
      }
    },
    [editItems],
  );

  // Handles ingredient selection from the detail search dialog.
  // Unlike handleAddIngredient (which sets quantity=0), this adds the item with the
  // user-selected quantity from the IngredientQuantityDialog already filled in.
  const handleAddFromDialog = useCallback(
    async (
      ingredientId: number,
      ingredientName: string,
      ingredientSlug: string,
      portionId: number | null,
      _measuringUnitId: number | null,
      quantity: number,
    ) => {
      const maxSort = editItems.reduce((max, i) => Math.max(max, i.sort_order), 0);

      try {
        const res = await fetch(`/api/ingredients/${ingredientSlug}/portions/`, { credentials: 'include' });
        const portions = await res.json();

        let selectedPortion = portionId
          ? portions.find((p: { id: number }) => p.id === portionId) ?? null
          : null;

        if (!selectedPortion) {
          selectedPortion = portions.find((p: { is_default: boolean }) => p.is_default) ?? portions[0] ?? null;
        }

        if (!selectedPortion) {
          toast.error('Keine Portion für diese Zutat gefunden');
          return;
        }

        setEditItems((prev) => [
          ...prev,
          {
            id: -Date.now(),
            portion_id: selectedPortion!.id,
            ingredient_id: ingredientId,
            ingredient_name: ingredientName,
            quantity,
            quantityInput: String(quantity),
            measuring_unit_name: selectedPortion!.measuring_unit_name || 'g',
            note: '',
            sort_order: maxSort + 1,
            ingredient_portions: portions.map((p: { id: number; name: string; weight_g: number | null; measuring_unit_name: string | null; is_default: boolean }) => ({
              id: p.id,
              name: p.name,
              weight_g: p.weight_g,
              measuring_unit_name: p.measuring_unit_name,
              is_default: p.is_default,
            })),
            isNew: true,
            isDirty: true,
          },
        ]);
      } catch {
        toast.error('Fehler beim Laden der Portion');
      }
    },
    [editItems],
  );

  // --- AI Estimate ---

  const handleEstimate = useCallback(async () => {
    try {
      const result = await estimateQuantities.mutateAsync();
      setEstimateResult(result.items);
      setShowEstimate(true);
    } catch {
      toast.error('AI-Schätzung fehlgeschlagen');
    }
  }, [estimateQuantities]);

  const handleApplyEstimate = useCallback(() => {
    if (!estimateResult || selectedEstimates.size === 0) return;
    const applied = selectedEstimates.size;
    setEditItems((prev) =>
      prev.map((item) => {
        if (!selectedEstimates.has(item.id)) return item;
        const estimate = estimateResult.find((e) => e.item_id === item.id);
        if (estimate) {
          return { ...item, quantity: estimate.quantity_per_portion, quantityInput: String(estimate.quantity_per_portion), isDirty: true };
        }
        return item;
      }),
    );
    setShowEstimate(false);
    setEstimateResult(null);
    setSelectedEstimates(new Set());
    toast.success(`${applied} von ${estimateResult.length} Mengen übernommen`);
  }, [estimateResult, selectedEstimates]);

  // --- AI Suggest Ingredients ---

  const handleAiSuggest = useCallback(async () => {
    setIsAiSuggesting(true);
    try {
      const suggestRes = await fetch(`/api/recipes/${recipeId}/ai-suggest-ingredients/`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!suggestRes.ok) throw new Error('Vorschläge fehlgeschlagen');
      const suggestions: AiIngredientSuggestion[] = await suggestRes.json();

      if (!suggestions || suggestions.length === 0) {
        toast.info('Keine weiteren Zutaten vorgeschlagen');
        return;
      }

      setAiSuggestions(suggestions);
      setSelectedAiSuggestions(new Set(suggestions.map((_, i) => i)));
    } catch {
      toast.error('KI-Vorschläge konnten nicht generiert werden');
    } finally {
      setIsAiSuggesting(false);
    }
  }, [recipeId]);

  const handleApplyAiSuggestions = useCallback(async () => {
    if (!aiSuggestions || selectedAiSuggestions.size === 0) return;

    const selected = aiSuggestions.filter((_, i) => selectedAiSuggestions.has(i));
    try {
      const applyRes = await fetch(`/api/recipes/${recipeId}/ai-apply-ingredients/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          selected.map((s) => ({
            ingredient_id: s.ingredient_id,
            portion_id: s.portion_id,
            quantity: s.quantity,
          })),
        ),
      });
      if (!applyRes.ok) throw new Error('Anwenden fehlgeschlagen');

      await queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      toast.success(`${selected.length} Zutaten hinzugefügt`);
      setAiSuggestions(null);
      setSelectedAiSuggestions(new Set());
      onSaved();
    } catch {
      toast.error('Fehler beim Hinzufügen der Zutaten');
    }
  }, [aiSuggestions, selectedAiSuggestions, recipeId, queryClient, onSaved]);

  // --- Save ---

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const promises: Promise<unknown>[] = [];

      // Always set servings to 1 (quantities are per-serving)
      if ((portions ?? 1) !== 1) {
        promises.push(updateRecipe.mutateAsync({ portions: 1 }));
      }

      // Delete removed items
      for (const item of editItems.filter((i) => i.isDeleted && !i.isNew)) {
        promises.push(deleteItem.mutateAsync(item.id));
      }

      // Create new items
      for (const item of editItems.filter((i) => i.isNew && !i.isDeleted)) {
        promises.push(
          createItem.mutateAsync({
            portion_id: item.portion_id,
            quantity: item.quantity,
            sort_order: item.sort_order,
            note: item.note,
          }),
        );
      }

      // Update dirty existing items
      for (const item of editItems.filter((i) => i.isDirty && !i.isNew && !i.isDeleted)) {
        promises.push(
          updateItem.mutateAsync({
            itemId: item.id,
            data: {
              portion_id: item.portion_id,
              quantity: item.quantity,
              note: item.note,
              sort_order: item.sort_order,
            },
          }),
        );
      }

      await Promise.all(promises);
      toast.success('Änderungen gespeichert');
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      toast.error('Fehler beim Speichern', { description: message });
    } finally {
      setIsSaving(false);
    }
  }, [editItems, portions, updateRecipe, deleteItem, createItem, updateItem, onSaved]);

  // --- Render ---

  const activeItems = editItems.filter((i) => !i.isDeleted);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
          <span className="material-symbols-outlined text-[18px]">edit</span>
          Bearbeitungsmodus
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAiSuggest}
            disabled={isAiSuggesting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50"
            title="Weitere Zutaten per KI vorschlagen"
          >
            <Sparkles className="w-4 h-4" />
            {isAiSuggesting ? 'Lädt...' : 'Weitere Zutaten'}
          </button>
          <button
            type="button"
            onClick={handleEstimate}
            disabled={estimateQuantities.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-200 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">auto_fix_high</span>
            {estimateQuantities.isPending ? 'Schätze...' : 'Mengen schätzen'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            {isSaving ? 'Speichert...' : 'Speichern'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-muted transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </div>

      {/* Ingredient Rows */}
      <div className="space-y-2">
        {activeItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
          >
            <input
              type="text"
              inputMode="decimal"
              value={item.quantityInput}
              onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
              onBlur={() => handleQuantityBlur(item.id)}
              className="w-20 px-2 py-1.5 text-sm text-right border rounded-md"
            />
            {item.ingredient_portions.length > 1 ? (
              <select
                value={item.portion_id}
                onChange={(e) => handlePortionChange(item.id, parseInt(e.target.value))}
                className="text-xs text-muted-foreground min-w-[3.5rem] px-1 py-1.5 border rounded-md bg-background"
              >
                {item.ingredient_portions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.measuring_unit_name || p.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-muted-foreground min-w-[3.5rem]">
                {item.measuring_unit_name || 'g'}
              </span>
            )}
            <span className="flex-1 text-sm font-medium truncate">{item.ingredient_name}</span>
            {expandedNotes.has(item.id) || item.note ? (
              <input
                type="text"
                value={item.note}
                onChange={(e) => handleNoteChange(item.id, e.target.value)}
                placeholder="Notiz"
                className="w-24 px-2 py-1.5 text-xs border rounded-md text-muted-foreground"
              />
            ) : (
              <button
                type="button"
                onClick={() => setExpandedNotes((prev) => new Set(prev).add(item.id))}
                className="p-1.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                title="Notiz hinzufügen"
              >
                <span className="material-symbols-outlined text-[16px]">sticky_note_2</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              className="p-1 text-destructive/60 hover:text-destructive transition-colors"
              title="Entfernen"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Add Ingredient */}
      <div className="pt-2 border-t flex items-center gap-2">
        <div className="flex-1">
          <IngredientAutocomplete
            value={inputValue}
            onChange={setInputValue}
            onSelect={(ingredient) => {
              handleAddIngredient(ingredient);
              setInputValue('');
            }}
            onCreateNew={(name) => {
              handleAddIngredient({ id: -Date.now(), name, slug: '' });
              setInputValue('');
            }}
            placeholder="Zutat hinzufügen..."
          />
        </div>
        <button
          type="button"
          onClick={() => setDetailSearchOpen(true)}
          className="p-2 rounded-lg border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0"
          title="Detailsuche"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Ingredient Detail Search Dialog */}
      <IngredientDetailSearchDialog
        open={detailSearchOpen}
        onOpenChange={setDetailSearchOpen}
        onSelect={handleAddFromDialog}
      />

      {/* AI Estimate Preview Dialog */}
      {showEstimate && estimateResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border p-6 mx-4 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-500">auto_fix_high</span>
              AI-Mengenschätzung
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Geschätzte Mengen pro Person:
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedEstimates.size === estimateResult.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEstimates(new Set(estimateResult.map((est) => est.item_id)));
                        } else {
                          setSelectedEstimates(new Set());
                        }
                      }}
                      className="rounded border-gray-300"
                      title="Alle auswählen"
                    />
                  </th>
                  <th className="pb-2">Zutat</th>
                  <th className="pb-2 text-right">Alt</th>
                  <th className="pb-2 text-right">Neu</th>
                </tr>
              </thead>
              <tbody>
                {estimateResult.map((est) => {
                  const currentItem = editItems.find((i) => i.id === est.item_id);
                  const altValue = currentItem && currentItem.quantity > 0
                    ? `${currentItem.quantity} ${currentItem.measuring_unit_name || 'g'}`
                    : '—';
                  const hasChange = !currentItem || currentItem.quantity !== est.quantity_per_portion;
                  return (
                    <tr
                      key={est.item_id}
                      className={`border-b last:border-0 ${hasChange ? 'bg-amber-50/50' : ''}`}
                    >
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={selectedEstimates.has(est.item_id)}
                          onChange={(e) => {
                            setSelectedEstimates((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) {
                                next.add(est.item_id);
                              } else {
                                next.delete(est.item_id);
                              }
                              return next;
                            });
                          }}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="py-2">{est.ingredient_name}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {altValue}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {est.quantity_per_portion} {est.unit}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEstimate(false);
                  setEstimateResult(null);
                  setSelectedEstimates(new Set());
                }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                Verwerfen
              </button>
              <button
                type="button"
                onClick={handleApplyEstimate}
                disabled={selectedEstimates.size === 0}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Übernehmen ({selectedEstimates.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Suggestions Confirmation Dialog */}
      {aiSuggestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-xl border p-6 mx-4 w-full max-w-lg shadow-xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              KI-Vorschläge
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Folgende Zutaten wurden vorgeschlagen:
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedAiSuggestions.size === aiSuggestions.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAiSuggestions(new Set(aiSuggestions.map((_, i) => i)));
                        } else {
                          setSelectedAiSuggestions(new Set());
                        }
                      }}
                      className="rounded border-gray-300"
                      title="Alle auswählen"
                    />
                  </th>
                  <th className="pb-2">Zutat</th>
                  <th className="pb-2 text-right">Menge</th>
                </tr>
              </thead>
              <tbody>
                {aiSuggestions.map((s, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selectedAiSuggestions.has(i)}
                        onChange={(e) => {
                          setSelectedAiSuggestions((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) {
                              next.add(i);
                            } else {
                              next.delete(i);
                            }
                            return next;
                          });
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="py-2 font-medium">{s.ingredient_name}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {s.quantity} {s.portion_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => {
                  setAiSuggestions(null);
                  setSelectedAiSuggestions(new Set());
                }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-muted transition-colors"
              >
                Verwerfen
              </button>
              <button
                type="button"
                onClick={handleApplyAiSuggestions}
                disabled={selectedAiSuggestions.size === 0}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Übernehmen ({selectedAiSuggestions.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
