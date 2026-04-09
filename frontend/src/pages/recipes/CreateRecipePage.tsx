/**
 * CreateRecipePage — Recipe creation using the shared ContentStepper.
 * Adds recipe-specific fields: recipe_type, servings.
 * Ingredients/images can be added after initial creation.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ContentStepper, { type ContentFormData } from '@/components/content/ContentStepper';
import { useCreateRecipe } from '@/api/recipes';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';

export default function CreateRecipePage() {
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();

  // Recipe-specific state
  const [recipeType, setRecipeType] = useState('warm_meal');
  const [servings, setServings] = useState(4);

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
      toast.success('Rezept erstellt!');
      navigate(`/recipes/${result.slug}`);
    } catch (err) {
      toast.error('Fehler beim Erstellen', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    }
  }

  return (
    <ContentStepper
      typeLabel="Rezept"
      typeIcon="menu_book"
      typeGradient="from-rose-500 to-pink-600"
      isSaving={createRecipe.isPending}
      onSave={handleSave}
      renderTypeFields={() => (
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

          {/* Info box */}
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-blue-500 text-[20px] mt-0.5">info</span>
              <p className="text-xs text-blue-700">
                Zutaten, Bilder und weitere Details kannst du nach dem Erstellen hinzufuegen.
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
        </>
      )}
    />
  );
}
