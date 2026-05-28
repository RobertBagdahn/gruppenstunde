/**
 * CreateRecipePage — Recipe creation using the shared ContentStepper.
 * Adds recipe-specific fields: recipe_type, servings, AI-suggested ingredients.
 * Includes URL import option.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ContentStepper, { type ContentFormData } from '@/components/content/ContentStepper';
import { useCreateRecipe } from '@/api/recipes';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import { IngredientAutocomplete } from '@/components/recipe/IngredientAutocomplete';
import type { AiRefurbish } from '@/schemas/content';
import { useRecipeImportUrl } from '@/api/recipeImport';

interface IngredientEntry {
  name: string;
  quantity: string;
  unit: string;
  ingredient_id: number | null;
  ingredient_slug: string | null;
}

export default function CreateRecipePage() {
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();
  const importUrl = useRecipeImportUrl();

  // Recipe-specific state
  const [recipeType, setRecipeType] = useState('warm_meal');
  const [servings, setServings] = useState(4);
  const [ingredients, setIngredients] = useState<IngredientEntry[]>([]);
  const [newIngredientSearch, setNewIngredientSearch] = useState('');

  // URL import state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [importUrlValue, setImportUrlValue] = useState('');

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
        // Pre-fill form data from recipe draft
        setFormData({
          title: data.recipe_draft.title,
          summary: '',
          description: data.recipe_draft.steps.join('\n\n'),
          difficulty: '',
          costsRating: '',
          executionTime: data.recipe_draft.execution_time
            ? data.recipe_draft.execution_time <= 15 ? 'less_15'
            : data.recipe_draft.execution_time <= 30 ? '15_30'
            : data.recipe_draft.execution_time <= 60 ? '30_60'
            : 'more_60'
            : '',
          preparationTime: data.recipe_draft.preparation_time
            ? data.recipe_draft.preparation_time <= 15 ? 'less_15'
            : data.recipe_draft.preparation_time <= 30 ? '15_30'
            : data.recipe_draft.preparation_time <= 60 ? '30_60'
            : 'more_60'
            : '',
          selectedTagIds: [],
          selectedScoutIds: [],
        });
        // Set recipe-specific fields
        if (data.recipe_draft.recipe_type) setRecipeType(data.recipe_draft.recipe_type);
        if (data.recipe_draft.servings) setServings(data.recipe_draft.servings);
        // Set ingredients
        setIngredients(
          data.recipe_items.map((item) => ({
            name: item.ingredient_name,
            quantity: String(item.quantity),
            unit: item.measuring_unit_name,
            ingredient_id: item.ingredient_id,
            ingredient_slug: null,
          })),
        );
        // Jump to step 1
        setInitialStep(1);
        setImportedKey((k) => k + 1);
        setShowUrlInput(false);
        toast.success('Rezept importiert!', {
          description: `${data.recipe_items.length} Zutaten zugeordnet${data.created_ingredients.length > 0 ? `, ${data.created_ingredients.length} neu angelegt` : ''}`,
        });
      },
      onError: (err: Error) => {
        toast.error('Import fehlgeschlagen', { description: err.message });
      },
    });
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
        servings,
        tag_ids: formData.selectedTagIds,
        scout_level_ids: formData.selectedScoutIds,
      });

      // Create RecipeItems for ingredients with valid DB match
      const validIngredients = ingredients.filter((ing) => ing.ingredient_id !== null);
      for (let i = 0; i < validIngredients.length; i++) {
        const ing = validIngredients[i];
        try {
          await fetch(`/api/recipes/${result.id}/recipe-items/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              ingredient_id: ing.ingredient_id,
              quantity: parseFloat(ing.quantity) || 1,
              sort_order: i,
              note: '',
              quantity_type: 'per_person',
            }),
          });
        } catch {
          // Silently skip failed items — user can add them later
        }
      }

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
    <ContentStepper
      key={importedKey}
      typeLabel="Rezept"
      typeIcon="menu_book"
      typeGradient="from-rose-500 to-pink-600"
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
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50">
            <span className="material-symbols-outlined text-[32px] text-emerald-600">link</span>
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
                        ? 'border-rose-500 bg-rose-50 shadow-md shadow-rose-500/10'
                        : 'border-border hover:border-rose-500/30 hover:bg-rose-50/50'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[24px] ${
                        recipeType === opt.value ? 'text-rose-600' : 'text-muted-foreground'
                      }`}
                    >
                      {opt.icon}
                    </span>
                    <span
                      className={`font-medium text-xs ${
                        recipeType === opt.value ? 'text-rose-700' : 'text-foreground'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Servings */}
            <div className="max-w-xs">
              <label className="block text-xs text-muted-foreground mb-1">Portionen</label>
              <input
                type="number"
                min={1}
                max={999}
                value={servings}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1) setServings(v);
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
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
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-blue-500 text-[20px] mt-0.5">info</span>
              <p className="text-xs text-blue-700">
                Bilder und weitere Details kannst du nach dem Erstellen hinzufügen.
                Das Rezept wird als Entwurf gespeichert.
              </p>
            </div>
          </div>
        </div>
      )}
      renderPreviewExtras={() => (
        <>
          {(recipeType || servings) && (
            <div className="flex flex-wrap gap-3 pt-2 border-t">
              {recipeType && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">restaurant</span>
                  {RECIPE_TYPE_OPTIONS.find((o) => o.value === recipeType)?.label ?? recipeType}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-medium">
                <span className="material-symbols-outlined text-[14px]">people</span>
                {servings} Portionen
              </span>
            </div>
          )}
          {ingredients.length > 0 && (
            <div className="pt-2 border-t">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Zutaten ({ingredients.length})</h4>
              <div className="flex flex-wrap gap-1.5">
                {ingredients.filter((i) => i.ingredient_id !== null).map((ing, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs">
                    {ing.quantity} {ing.unit} {ing.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    />
    </>
  );
}
