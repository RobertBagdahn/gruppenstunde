/**
 * Page for importing recipes from external URLs.
 * Shows URL input → fetches preview → allows user to confirm and save.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import RecipeThumbnail from '@/components/recipe/RecipeThumbnail';
import ConfirmDialog from '@/components/ConfirmDialog';
import RecipeServingContextSelector from '@/components/recipe/RecipeServingContextSelector';
import { useRecipeImportUrl, type RecipeImportUrlResponse } from '@/api/recipeImport';
import { useCreateRecipe } from '@/api/recipes';
import { normalizeServingContext, toBasePerServing } from '@/lib/cookingQuantityScale';

type RecipeImportPreview = RecipeImportUrlResponse;

export default function RecipeImportPage() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<RecipeImportPreview | null>(null);
  const [servingContext, setServingContext] = useState<number | null>(null);
  const [servingContextDraft, setServingContextDraft] = useState(1);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const navigate = useNavigate();
  const createRecipe = useCreateRecipe();
  const isCreating = createRecipe.isPending;

  const importMutation = useRecipeImportUrl();
  const previewRecipe = preview?.recipe_draft;
  const previewSteps = previewRecipe?.steps ?? [];

  const handleImport = () => {
    if (!url.trim()) return;
    importMutation.mutate(url.trim(), {
      onSuccess: (data) => {
        setPreview(data);
        const detected = data.recipe_draft.servings;
        const normalized = detected == null ? null : normalizeServingContext(detected);
        setServingContext(normalized);
        setServingContextDraft(normalized ?? 1);
      },
      onError: (err) => toast.error('Import fehlgeschlagen', { description: err.message }),
    });
  };

  const handleCreateRecipe = async () => {
    if (!preview) return;
    if (servingContext === null) {
      toast.error('Bitte lege zuerst die Personenzahl fest.');
      return;
    }
    setShowSaveConfirmation(true);
  };

  const confirmCreateRecipe = async () => {
    if (!preview || servingContext === null) return;
    setShowSaveConfirmation(false);
    try {
      const recipe = await createRecipe.mutateAsync({
        title: preview.recipe_draft.title,
        description: preview.recipe_draft.description,
        summary: preview.recipe_draft.summary,
        recipe_type: preview.recipe_draft.recipe_type || 'warm_meal',
        difficulty: preview.recipe_draft.difficulty,
        execution_time: preview.recipe_draft.execution_time_choice,
        preparation_time: preview.recipe_draft.preparation_time_choice,
        source_url: preview.recipe_draft.source_url,
        image_url: preview.recipe_draft.image_url,
        tag_ids: preview.recipe_draft.tag_ids.map(String),
        scout_level_ids: preview.recipe_draft.scout_level_ids,
        recipe_items: preview.recipe_items.map((item, index) => ({
            portion_id: item.portion_id,
            quantity: toBasePerServing(item.quantity, servingContext),
            note: item.note,
            sort_order: index,
          })),
        steps: preview.recipe_draft.steps.map((instruction, index) => ({
          sort_order: index,
          instruction,
          duration_minutes: null,
          section: '',
          step_ingredients: [],
        })),
      });
      navigate(`/recipes/${recipe.slug}`);
    } catch (error) {
      toast.error('Rezept konnte nicht übernommen werden', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
      });
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <span className="material-symbols-outlined text-[24px]">download</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Rezept importieren</h1>
          <p className="text-sm text-muted-foreground">
            Rezepte automatisch von externen Webseiten übernehmen
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>URL eingeben</CardTitle>
          <CardDescription>
            Füge die URL eines Rezepts ein (z.B. von Chefkoch, EatSmarter oder anderen Seiten mit
            strukturierten Daten).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://www.chefkoch.de/rezepte/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleImport()}
            />
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || !url.trim()}
            >
               {importMutation.isPending ? 'Rezept wird analysiert... Das kann einen Moment dauern.' : 'Importieren'}
            </Button>
          </div>
          {importMutation.isError && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">error</span>
              <div>
                <p className="font-medium">Import fehlgeschlagen</p>
                <p className="text-muted-foreground mt-0.5">
                  {importMutation.error instanceof Error
                    ? importMutation.error.message
                    : 'URL konnte nicht geladen werden'}
                </p>
                <p className="text-muted-foreground mt-1">
                  Bitte URL prüfen oder Rezept manuell anlegen.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{previewRecipe?.title}</CardTitle>
            {previewRecipe?.description && (
              <CardDescription className="line-clamp-3">{previewRecipe.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <RecipeThumbnail
              imageUrl={previewRecipe?.image_url ?? ''}
              title={previewRecipe?.title ?? ''}
              size="full"
              imgClassName="rounded-md"
              className="rounded-md"
            />

            <div className="flex gap-4 text-sm text-muted-foreground">
               <span>{previewRecipe?.servings ?? 'Keine Personenzahl erkannt'} {previewRecipe?.servings ? 'Portionen' : ''}</span>
              {previewRecipe?.preparation_time && <span>{previewRecipe.preparation_time} Min. Vorbereitung</span>}
              {previewRecipe?.execution_time && <span>{previewRecipe.execution_time} Min. Kochen</span>}
            </div>

            {servingContext === null ? (
              <RecipeServingContextSelector
                value={servingContextDraft}
                onChange={setServingContextDraft}
                onConfirm={() => setServingContext(servingContextDraft)}
                description="Für diesen Import wurde keine verlässliche Personenzahl erkannt. Lege fest, für wie viele Personen die importierten Mengen gelten."
                confirmLabel="Personenzahl übernehmen"
              />
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="recipe-import-serving-summary">
                Importierte Mengen für <strong>{servingContext} {servingContext === 1 ? 'Person' : 'Personen'}</strong>.
                Diese Zahl bleibt für die Übernahme gesperrt.
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">
                Zutaten ({preview.recipe_items.length})
              </h3>
              <ul className="space-y-1 text-sm">
                {preview.recipe_items.map((ing, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-medium">{ing.quantity} {ing.measuring_unit_name}</span>
                    <span>{ing.ingredient_name}</span>
                  </li>
                ))}
              </ul>
            </div>

            {previewSteps.length > 0 && previewRecipe && (
              <div>
                <h3 className="font-semibold mb-2">
                  Zubereitung ({previewSteps.length} Schritte)
                </h3>
                <ol className="space-y-2 text-sm list-decimal list-inside">
                  {previewSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            <div className="flex gap-2 pt-4">
               <Button onClick={handleCreateRecipe} disabled={isCreating}>
                 {isCreating ? 'Rezept wird übernommen...' : 'Rezept übernehmen'}
              </Button>
              <Button variant="outline" onClick={() => setPreview(null)}>
                Verwerfen
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={showSaveConfirmation}
        onConfirm={() => void confirmCreateRecipe()}
        onCancel={() => setShowSaveConfirmation(false)}
        variant="default"
        title={`Import für ${servingContext ?? 1} ${servingContext === 1 ? 'Person' : 'Personen'} übernehmen?`}
        description="Die importierten Gesamtmengen werden beim Speichern intern auf Pro-1-Person-Mengen normiert."
        confirmLabel="Rezept übernehmen"
        loading={isCreating}
      />
    </div>
  );
}
