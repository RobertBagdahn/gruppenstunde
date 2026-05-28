/**
 * InlineIngredientEditor — Edit-Mode for recipe ingredients on the detail page.
 * Allows editing quantities, units, notes, adding/removing items, and AI estimation.
 */
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  useUpdateRecipe,
  useUpdateRecipeItem,
  useDeleteRecipeItem,
  useCreateRecipeItem,
  useEstimateQuantities,
} from '@/api/recipes';
import { IngredientAutocomplete } from './IngredientAutocomplete';
import type { RecipeItem } from '@/schemas/recipe';
import type { EstimateQuantityItem } from '@/schemas/recipe';

// --- Types ---

interface EditableItem {
  id: number;
  ingredient_id: number | null;
  ingredient_name: string;
  quantity: number;
  measuring_unit_id: number | null;
  measuring_unit_name: string | null;
  note: string;
  sort_order: number;
  isNew?: boolean;
  isDeleted?: boolean;
  isDirty?: boolean;
}

interface InlineIngredientEditorProps {
  recipeId: number;
  items: RecipeItem[];
  servings: number | null;
  onClose: () => void;
  onSaved: () => void;
}

// --- Component ---

export default function InlineIngredientEditor({
  recipeId,
  items,
  servings,
  onClose,
  onSaved,
}: InlineIngredientEditorProps) {
  const [editServings, setEditServings] = useState(servings ?? 1);
  const [editItems, setEditItems] = useState<EditableItem[]>(() =>
    items.map((item) => ({
      id: item.id,
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredient_name,
      quantity: item.quantity,
      measuring_unit_id: item.measuring_unit_id,
      measuring_unit_name: item.measuring_unit_name ?? null,
      note: item.note,
      sort_order: item.sort_order,
    })),
  );
  const [showEstimate, setShowEstimate] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [estimateResult, setEstimateResult] = useState<EstimateQuantityItem[] | null>(null);
  const [selectedEstimates, setSelectedEstimates] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [justScaled, setJustScaled] = useState(false);

  useEffect(() => {
    if (!justScaled) return;
    const timer = setTimeout(() => setJustScaled(false), 1000);
    return () => clearTimeout(timer);
  }, [justScaled]);

  const updateRecipe = useUpdateRecipe(recipeId);
  const updateItem = useUpdateRecipeItem(recipeId);
  const deleteItem = useDeleteRecipeItem(recipeId);
  const createItem = useCreateRecipeItem(recipeId);
  const estimateQuantities = useEstimateQuantities(recipeId);

  // --- Handlers ---

  const handleServingsChange = useCallback((newServings: number) => {
    const clamped = Math.max(1, Math.min(100, newServings));
    if (clamped === editServings) return;
    const ratio = clamped / editServings;
    setEditItems((prev) =>
      prev.map((item) => ({
        ...item,
        quantity: Math.round(item.quantity * ratio * 100) / 100,
        isDirty: true,
      })),
    );
    setEditServings(clamped);
    setJustScaled(true);
  }, [editServings]);

  const handleQuantityChange = useCallback((id: number, quantity: number) => {
    setEditItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity, isDirty: true } : item)),
    );
  }, []);

  const handleNoteChange = useCallback((id: number, note: string) => {
    setEditItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, note, isDirty: true } : item)),
    );
  }, []);

  const handleDelete = useCallback((id: number) => {
    setEditItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isDeleted: true } : item)),
    );
  }, []);

  const handleAddIngredient = useCallback(
    (ingredient: { id: number; name: string }) => {
      const maxSort = editItems.reduce((max, i) => Math.max(max, i.sort_order), 0);
      setEditItems((prev) => [
        ...prev,
        {
          id: -Date.now(), // temporary negative ID for new items
          ingredient_id: ingredient.id,
          ingredient_name: ingredient.name,
          quantity: 0,
          measuring_unit_id: null,
          measuring_unit_name: 'g',
          note: '',
          sort_order: maxSort + 1,
          isNew: true,
          isDirty: true,
        },
      ]);
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
          return { ...item, quantity: estimate.quantity_per_person, isDirty: true };
        }
        return item;
      }),
    );
    setShowEstimate(false);
    setEstimateResult(null);
    setSelectedEstimates(new Set());
    toast.success(`${applied} von ${estimateResult.length} Mengen übernommen`);
  }, [estimateResult, selectedEstimates]);

  // --- Save ---

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const promises: Promise<unknown>[] = [];

      // Update servings if changed
      if (editServings !== (servings ?? 1)) {
        promises.push(updateRecipe.mutateAsync({ servings: editServings }));
      }

      // Delete removed items
      for (const item of editItems.filter((i) => i.isDeleted && !i.isNew)) {
        promises.push(deleteItem.mutateAsync(item.id));
      }

      // Create new items
      for (const item of editItems.filter((i) => i.isNew && !i.isDeleted)) {
        promises.push(
          createItem.mutateAsync({
            ingredient_id: item.ingredient_id,
            quantity: item.quantity,
            measuring_unit_id: item.measuring_unit_id,
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
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  }, [editItems, editServings, servings, updateRecipe, deleteItem, createItem, updateItem, onSaved]);

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

      {/* Servings Editor */}
      <div className="flex items-center gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
        <span className="material-symbols-outlined text-amber-600">restaurant</span>
        <span className="text-sm font-medium">Portionen (Basis):</span>
        <input
          type="number"
          min={1}
          max={100}
          value={editServings}
          onChange={(e) => handleServingsChange(parseInt(e.target.value) || 1)}
          className="w-16 px-2 py-1 text-center text-sm border rounded-lg"
        />
      </div>

      {/* Ingredient Rows */}
      <div className="space-y-2">
        {activeItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
          >
            <input
              type="number"
              min={0}
              step={0.1}
              value={item.quantity}
              onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 0)}
              className={`w-20 px-2 py-1.5 text-sm text-right border rounded-md transition-colors duration-500 ${justScaled ? 'bg-amber-100 border-amber-300' : ''}`}
            />
            <span className="text-xs text-muted-foreground min-w-[3.5rem]">
              {item.measuring_unit_name || 'g'}
            </span>
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
      <div className="pt-2 border-t">
        <IngredientAutocomplete
          value=""
          onChange={() => {}}
          onSelect={(ingredient) => handleAddIngredient(ingredient)}
          onCreateNew={(name) => handleAddIngredient({ id: -Date.now(), name })}
          placeholder="Zutat hinzufügen..."
        />
      </div>

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
                  const hasChange = !currentItem || currentItem.quantity !== est.quantity_per_person;
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
                        {est.quantity_per_person} {est.unit}
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
    </div>
  );
}
