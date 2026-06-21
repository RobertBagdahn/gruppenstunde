/**
 * CreateRecipePage — Recipe creation using the shared ContentStepper.
 * Adds recipe-specific fields: recipe_type, servings, AI-suggested ingredients.
 * Includes URL import option.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import ContentStepper, { type ContentFormData } from '@/components/content/ContentStepper';
import { useCreateRecipe } from '@/api/recipes';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import { IngredientAutocomplete } from '@/components/recipe/IngredientAutocomplete';
import type { AiRefurbish } from '@/schemas/content';
import {
  DIFFICULTY_OPTIONS,
  EXECUTION_TIME_OPTIONS,
  COSTS_RATING_OPTIONS,
  PREPARATION_TIME_OPTIONS,
} from '@/schemas/content';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import { useTags, useScoutLevels } from '@/api/tags';
import { useRecipeImportUrl } from '@/api/recipeImport';
import { useIngredient } from '@/api/supplies';

interface IngredientEntry {
  name: string;
  quantity: string;
  unit: string;
  ingredient_id: number | null;
  ingredient_slug: string | null;
  portion_id: number | null;
  is_new_ingredient?: boolean;
}

/** Pending import data waiting for portion normalization confirmation. */
interface PendingImport {
  detectedServings: number;
  ingredients: IngredientEntry[];
  formData: ContentFormData;
  recipeType: string;
}

export default function CreateRecipePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createRecipe = useCreateRecipe();
  const importUrl = useRecipeImportUrl();

  // Pre-fill ingredient from URL param ?ingredient={slug}
  const ingredientSlug = searchParams.get('ingredient');
  const { data: prefilledIngredient } = useIngredient(ingredientSlug || '');
  const prefilledRef = useRef(false);

  useEffect(() => {
    if (prefilledRef.current || !prefilledIngredient || !ingredientSlug) return;
    if (prefilledIngredient.portions.length === 0) return;

    const defaultPortion =
      prefilledIngredient.portions.find((p) => p.is_default) ?? prefilledIngredient.portions[0];

    setIngredients([
      {
        name: prefilledIngredient.name,
        quantity: '1',
        unit: defaultPortion.measuring_unit_name ?? 'Stück',
        ingredient_id: prefilledIngredient.id,
        ingredient_slug: prefilledIngredient.slug,
        portion_id: defaultPortion.id,
      },
    ]);
    prefilledRef.current = true;
  }, [prefilledIngredient, ingredientSlug]);

  // Recipe-specific state
  const [recipeType, setRecipeType] = useState('warm_meal');
  const [, setServings] = useState(1);
  const [ingredients, setIngredients] = useState<IngredientEntry[]>([]);
  const [newIngredientSearch, setNewIngredientSearch] = useState('');

  // URL import state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [importUrlValue, setImportUrlValue] = useState('');

  // Portion normalization state
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [normalizeServings, setNormalizeServings] = useState(1);

  // Tags and scout levels for preview
  const { data: tags } = useTags();
  const { data: scoutLevels } = useScoutLevels();

  // Form data (controlled for URL import pre-fill)
  const [formData, setFormData] = useState<ContentFormData>({
    title: '',
    summary: '',
    description: '',
    difficulty: '',
    costsRating: '',
    executionTime: '',
    preparationTime: '',
    selectedTagIds: [],
    selectedScoutIds: [],
  });
  // Track step externally to jump to step 1 after import
  const [importedKey, setImportedKey] = useState(0);
  const [initialStep, setInitialStep] = useState(0);

  function handleUrlImport() {
    if (!importUrlValue.trim()) return;
    importUrl.mutate(importUrlValue.trim(), {
      onSuccess: (data) => {
        const importedFormData: ContentFormData = {
          title: data.recipe_draft.title,
          summary: data.recipe_draft.summary || '',
          description: data.recipe_draft.steps.join('\n\n'),
          difficulty: data.recipe_draft.difficulty || '',
          costsRating: data.recipe_draft.costs_rating || '',
          executionTime: data.recipe_draft.execution_time_choice || '',
          preparationTime: data.recipe_draft.preparation_time_choice || '',
          selectedTagIds: data.recipe_draft.tag_ids || [],
          selectedScoutIds: data.recipe_draft.scout_level_ids || [],
        };
        const importedIngredients = data.recipe_items.map((item) => ({
          name: item.ingredient_name,
          quantity: String(item.quantity),
          unit: item.measuring_unit_name,
          ingredient_id: item.ingredient_id,
          ingredient_slug: null,
          portion_id: item.portion_id,
          is_new_ingredient: item.is_new_ingredient,
        }));
        const detectedServings = data.recipe_draft.servings ?? 1;
        const importedRecipeType = data.recipe_draft.recipe_type || 'warm_meal';

        setShowUrlInput(false);

        if (detectedServings > 1) {
          // Show normalization dialog
          setPendingImport({
            detectedServings,
            ingredients: importedIngredients,
            formData: importedFormData,
            recipeType: importedRecipeType,
          });
          setNormalizeServings(detectedServings);
        } else {
          // servings=1 → apply directly
          applyImport(importedFormData, importedIngredients, importedRecipeType);
        }

        toast.success('Rezept importiert!', {
          description: `${data.recipe_items.length} Zutaten zugeordnet${data.created_ingredients.length > 0 ? `, ${data.created_ingredients.length} neu angelegt` : ''}`,
        });
      },
      onError: (err: Error) => {
        toast.error('Import fehlgeschlagen', { description: err.message });
      },
    });
  }

  /** Apply import data to form, normalizing quantities to 1 portion. */
  const applyImport = useCallback((
    importedFormData: ContentFormData,
    importedIngredients: IngredientEntry[],
    importedRecipeType: string,
    divideBy = 1,
  ) => {
    setFormData(importedFormData);
    setRecipeType(importedRecipeType);
    setServings(1);
    setIngredients(
      divideBy > 1
        ? importedIngredients.map((ing) => ({
            ...ing,
            quantity: String(
              Math.round((parseFloat(ing.quantity) / divideBy) * 100) / 100,
            ),
          }))
        : importedIngredients,
    );
    setInitialStep(1);
    setImportedKey((k) => k + 1);
  }, []);

  /** User confirmed normalization in the dialog. */
  function handleNormalizeConfirm() {
    if (!pendingImport) return;
    applyImport(
      pendingImport.formData,
      pendingImport.ingredients,
      pendingImport.recipeType,
      normalizeServings,
    );
    setPendingImport(null);
  }

  /** User skipped normalization (keep original quantities). */
  function handleNormalizeSkip() {
    if (!pendingImport) return;
    applyImport(
      pendingImport.formData,
      pendingImport.ingredients,
      pendingImport.recipeType,
      1,
    );
    setPendingImport(null);
  }

  function handleRefurbishComplete(data: AiRefurbish) {
    if (data.suggested_ingredients?.length) {
      setIngredients(
        data.suggested_ingredients.map((ing) => ({
          name: ing.matched_name || ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          ingredient_id: ing.ingredient_id ?? null,
          ingredient_slug: ing.ingredient_slug ?? null,
          portion_id: null,
          is_new_ingredient: false,
        })),
      );
    }
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, field: keyof IngredientEntry, value: string) {
    setIngredients((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  function addIngredient(selected: { id: number; name: string; slug: string }) {
    setIngredients((prev) => [
      ...prev,
      {
        name: selected.name,
        quantity: '1',
        unit: 'Stück',
        ingredient_id: selected.id,
        ingredient_slug: selected.slug,
        portion_id: null,
        is_new_ingredient: false,
      },
    ]);
    setNewIngredientSearch('');
  }

  async function handleSave(formData: ContentFormData) {
    try {
      const result = await createRecipe.mutateAsync({
        title: formData.title,
        summary: formData.summary,
        description: formData.description,
        difficulty: formData.difficulty || undefined,
        costs_rating: formData.costsRating || undefined,
        execution_time: formData.executionTime || undefined,
        preparation_time: formData.preparationTime || undefined,
        recipe_type: recipeType || undefined,
        portions: 1,
        tag_ids: formData.selectedTagIds,
        scout_level_ids: formData.selectedScoutIds,
        recipe_items: ingredients
          .filter((ing) => ing.portion_id !== null)
          .map((ing, i) => ({
            portion_id: ing.portion_id!,
            quantity: parseFloat(ing.quantity) || 1,
            sort_order: i,
            note: '',
          })),
      });

      toast.success('Rezept erstellt!');
      navigate(`/recipes/${result.slug}`);
    } catch (err) {
      toast.error('Fehler beim Erstellen', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    }
  }

  return (
    <>
      {/* URL import overlay */}
      {showUrlInput && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Rezept von URL importieren</h3>
            <p className="text-sm text-muted-foreground">
              Füge die URL eines Rezepts ein. Die KI analysiert das Rezept und ordnet die Zutaten zu.
            </p>
            <input
              type="url"
              value={importUrlValue}
              onChange={(e) => setImportUrlValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
              placeholder="https://www.chefkoch.de/rezepte/..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              autoFocus
            />
            {importUrl.isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Rezept wird analysiert... Das kann einen Moment dauern.
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUrlImport}
                disabled={importUrl.isPending || !importUrlValue.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                Importieren
              </button>
              <button
                type="button"
                onClick={() => { setShowUrlInput(false); setImportUrlValue(''); }}
                disabled={importUrl.isPending}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portion normalization dialog */}
      {pendingImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[24px]">tune</span>
              <h3 className="text-lg font-semibold">Portionsmenge prüfen</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Das importierte Rezept ist für <strong>{pendingImport.detectedServings} Portionen</strong>.
              Die Mengen werden automatisch auf <strong>1 Portion</strong> umgerechnet.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-muted-foreground">
                Für wie viele Portionen ist das Original-Rezept?
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={normalizeServings}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1) setNormalizeServings(v);
                }}
                className="w-24 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Preview of normalization */}
            <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Vorschau (pro 1 Portion):</p>
              {pendingImport.ingredients.slice(0, 8).map((ing, idx) => {
                const original = parseFloat(ing.quantity);
                const normalized = Math.round((original / normalizeServings) * 100) / 100;
                return (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground line-through w-16 text-right">{original} {ing.unit}</span>
                    <span className="material-symbols-outlined text-[14px] text-muted-foreground">arrow_forward</span>
                    <span className="font-medium w-16">{normalized} {ing.unit}</span>
                    <span className="text-muted-foreground truncate">{ing.name}</span>
                  </div>
                );
              })}
              {pendingImport.ingredients.length > 8 && (
                <p className="text-xs text-muted-foreground">... und {pendingImport.ingredients.length - 8} weitere</p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleNormalizeConfirm}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
                Auf 1 Portion umrechnen
              </button>
              <button
                type="button"
                onClick={handleNormalizeSkip}
                className="px-4 py-2 rounded-lg border text-sm"
              >
                Mengen beibehalten
              </button>
            </div>
          </div>
        </div>
      )}
    <ContentStepper
      key={importedKey}
      typeLabel="Rezept"
      typeIcon="menu_book"
      typeGradient="from-primary to-emerald-600"
      contentType="recipe"
      isSaving={createRecipe.isPending}
      onSave={handleSave}
      onRefurbishComplete={handleRefurbishComplete}
      formData={formData}
      onFormDataChange={setFormData}
      initialStep={initialStep}
      renderExtraStep0Cards={() => (
        <button
          type="button"
          onClick={() => setShowUrlInput(true)}
          className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:shadow-md transition-all text-center"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20">
            <span className="material-symbols-outlined text-[32px] text-primary">link</span>
          </div>
          <span className="font-semibold">Von URL importieren</span>
          <span className="text-xs text-muted-foreground">
            Importiere ein Rezept von einer Webseite
          </span>
        </button>
      )}
      renderTypeFields={() => (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <h3 className="text-sm font-medium">Rezept-Details</h3>

            {/* Recipe type grid */}
            <div>
              <label className="block text-xs text-muted-foreground mb-2">Rezeptart</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {RECIPE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRecipeType(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      recipeType === opt.value
                        ? 'border-primary bg-primary/10 shadow-md shadow-primary/10'
                        : 'border-border hover:border-primary/30 hover:bg-primary/5'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[24px] ${
                        recipeType === opt.value ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {opt.icon}
                    </span>
                    <span
                      className={`font-medium text-xs ${
                        recipeType === opt.value ? 'text-primary' : 'text-foreground'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Ingredients section */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <h3 className="text-sm font-medium">Zutaten</h3>

            {ingredients.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Noch keine Zutaten. Nutze die KI-Beschreibung oder füge manuell hinzu.
              </p>
            ) : (
              <div className="space-y-2">
                {ingredients.map((ing, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border p-2"
                  >
                    <input
                      type="text"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                      className="w-16 rounded border border-input bg-background px-2 py-1 text-sm text-center"
                    />
                    <input
                      type="text"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      className="w-16 rounded border border-input bg-background px-2 py-1 text-sm text-center"
                    />
                    <span className="flex-1 text-sm truncate">
                      {ing.name}
                      {ing.is_new_ingredient && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">Neu</span>
                      )}
                      {ing.ingredient_id === null && (
                        <span className="ml-1 text-xs text-amber-600">(nicht zugeordnet)</span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add ingredient */}
            <div className="pt-2">
              <IngredientAutocomplete
                value={newIngredientSearch}
                onChange={setNewIngredientSearch}
                onSelect={addIngredient}
                placeholder="Zutat hinzufügen..."
              />
            </div>
          </div>

          {/* Info box */}
          <div className="bg-[hsl(var(--chart-3))]/10 rounded-lg border border-[hsl(var(--chart-3))]/20 p-4">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[hsl(var(--chart-3))] text-[20px] mt-0.5">info</span>
              <p className="text-xs text-[hsl(var(--chart-3))]">
                Bilder und weitere Details kannst du nach dem Erstellen hinzufügen.
                Das Rezept wird als Entwurf gespeichert.
              </p>
            </div>
          </div>
        </div>
      )}
      hideDefaultPreviewBody
      renderPreviewExtras={(fd) => {
        const getLabel = (options: readonly { value: string; label: string }[], value: string) =>
          options.find((o) => o.value === value)?.label ?? value;

        return (
          <div className="space-y-6">
            {/* Recipe type */}
            {recipeType && (
              <div className="flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                  <span className="material-symbols-outlined text-[16px]">restaurant</span>
                  {RECIPE_TYPE_OPTIONS.find((o) => o.value === recipeType)?.label ?? recipeType}
                </span>
              </div>
            )}

            {/* KPI Grid 2×2 */}
            {(fd.difficulty || fd.executionTime || fd.costsRating || fd.preparationTime) && (
              <div className="grid grid-cols-2 gap-3">
                {fd.difficulty && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <span className="material-symbols-outlined text-[20px] text-muted-foreground">signal_cellular_alt</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Schwierigkeit</p>
                      <p className="text-sm font-medium">{getLabel(DIFFICULTY_OPTIONS, fd.difficulty)}</p>
                    </div>
                  </div>
                )}
                {fd.executionTime && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <span className="material-symbols-outlined text-[20px] text-muted-foreground">schedule</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Kochzeit</p>
                      <p className="text-sm font-medium">{getLabel(EXECUTION_TIME_OPTIONS, fd.executionTime)}</p>
                    </div>
                  </div>
                )}
                {fd.costsRating && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <span className="material-symbols-outlined text-[20px] text-muted-foreground">payments</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Kosten</p>
                      <p className="text-sm font-medium">{getLabel(COSTS_RATING_OPTIONS, fd.costsRating)}</p>
                    </div>
                  </div>
                )}
                {fd.preparationTime && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                    <span className="material-symbols-outlined text-[20px] text-muted-foreground">timer</span>
                    <div>
                      <p className="text-xs text-muted-foreground">Vorbereitung</p>
                      <p className="text-sm font-medium">{getLabel(PREPARATION_TIME_OPTIONS, fd.preparationTime)}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ingredients as vertical list */}
            {ingredients.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">grocery</span>
                  Zutaten ({ingredients.length})
                </h4>
                <ul className="space-y-1.5">
                  {ingredients.filter((i) => i.ingredient_id !== null).map((ing, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm py-1 px-2 rounded-md hover:bg-muted/30">
                      <span className="text-muted-foreground w-16 text-right font-medium">{ing.quantity} {ing.unit}</span>
                      <span>{ing.name}</span>
                      {ing.is_new_ingredient && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">Neu</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Description / Zubereitung */}
            {fd.description && (
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">menu_book</span>
                  Zubereitung
                </h4>
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={fd.description} />
                </div>
              </div>
            )}

            {/* Tags */}
            {fd.selectedTagIds.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">label</span>
                  Tags
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {fd.selectedTagIds.map((id) => (
                    <span key={id} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {tags?.find((t) => t.id === id)?.name ?? `Tag ${id}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Scout levels */}
            {fd.selectedScoutIds.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">hiking</span>
                  Pfadfinderstufen
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {fd.selectedScoutIds.map((id) => (
                    <span key={id} className="px-2.5 py-1 rounded-full bg-accent/10 text-accent-foreground text-xs font-medium">
                      {scoutLevels?.find((s) => s.id === id)?.name ?? `Stufe ${id}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }}
    />
    </>
  );
}
