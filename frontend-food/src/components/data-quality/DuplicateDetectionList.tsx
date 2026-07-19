import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  useIngredientDuplicates,
  useRecipeDuplicates,
  useMergePreview,
  useMergeIngredients,
  useDismissDuplicate,
  useRecipeMergePreview,
  useRecipeMerge,
  useRecipeDismissDuplicate,
} from '@/api/dataQuality';
import type { DuplicatePair, MergePreview, RecipeMergePreview } from '@/schemas/dataQuality';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, GitMerge, EyeOff, AlertTriangle, ArrowRight, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import IngredientMergeDialog from '@/components/ingredients/IngredientMergeDialog';

interface DuplicateDetectionListProps {
  type: 'ingredient' | 'recipe';
}

function similarityColor(similarity: number): string {
  if (similarity >= 0.97) return 'text-red-600';
  if (similarity >= 0.92) return 'text-amber-600';
  if (similarity >= 0.85) return 'text-amber-500';
  return 'text-muted-foreground';
}

export default function DuplicateDetectionList({ type }: DuplicateDetectionListProps) {
  const ingredientsQuery = useIngredientDuplicates();
  const recipesQuery = useRecipeDuplicates();
  const query = type === 'ingredient' ? ingredientsQuery : recipesQuery;
  const { data, isLoading, error } = query;

  const dismissMutation = useDismissDuplicate();
  const mergeMutation = useMergeIngredients();
  const recipeDismissMutation = useRecipeDismissDuplicate();
  const recipeMergeMutation = useRecipeMerge();

  const isIngredient = type === 'ingredient';

  // Merge dialog state
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergePair, setMergePair] = useState<{ sourceId: number; targetId: number; sourceName: string; targetName: string } | null>(null);
  // Ingredient merge dialog state (separate for shared component)
  const [ingredientMergeOpen, setIngredientMergeOpen] = useState(false);
  const [ingredientMergeTarget, setIngredientMergeTarget] = useState<{ id: number; name: string; slug: string } | null>(null);
  const [ingredientMergeSource, setIngredientMergeSource] = useState<{ id: number; name: string; slug: string } | null>(null);

  const ingredientMergePreviewQuery = useMergePreview(mergePair?.sourceId ?? 0, mergePair?.targetId ?? 0);
  const recipeMergePreviewQuery = useRecipeMergePreview(mergePair?.sourceId ?? 0, mergePair?.targetId ?? 0);
  const mergePreviewQuery = isIngredient ? ingredientMergePreviewQuery : recipeMergePreviewQuery;
  const { data: mergePreview, isLoading: mergePreviewLoading, error: mergePreviewError } = mergePreviewQuery;

  const activeMergeMutation = isIngredient ? mergeMutation : recipeMergeMutation;
  const activeDismissMutation = isIngredient ? dismissMutation : recipeDismissMutation;

  const handleDismiss = async (aId: number, bId: number) => {
    try {
      if (isIngredient) {
        await dismissMutation.mutateAsync({ ingredient_a_id: aId, ingredient_b_id: bId });
      } else {
        await recipeDismissMutation.mutateAsync({ recipe_a_id: aId, recipe_b_id: bId });
      }
      toast.success('Als kein Duplikat markiert');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Markieren');
    }
  };

  const handleOpenMerge = (aId: number, aName: string, aSlug: string, bId: number, bName: string, bSlug: string) => {
    if (isIngredient) {
      setIngredientMergeSource({ id: aId, name: aName, slug: aSlug });
      setIngredientMergeTarget({ id: bId, name: bName, slug: bSlug });
      setIngredientMergeOpen(true);
    } else {
      setMergePair({ sourceId: aId, targetId: bId, sourceName: aName, targetName: bName });
      setMergeDialogOpen(true);
    }
  };

  const handleConfirmMerge = async () => {
    if (!mergePair) return;
    try {
      await activeMergeMutation.mutateAsync({ source_id: mergePair.sourceId, target_id: mergePair.targetId });
      toast.success(`${mergePair.sourceName} → ${mergePair.targetName} zusammengeführt`);
      setMergeDialogOpen(false);
      setMergePair(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Zusammenführen');
    }
  };

  const entityUrl = (slug: string) => type === 'ingredient' ? `/ingredients/${slug}` : `/recipes/${slug}`;
  const entityLabel = type === 'ingredient' ? 'Zutat' : 'Rezept';

  return (
    <div className="space-y-4">
      {/* Loading / Error */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-2xl text-muted-foreground" />
        </div>
      )}
      {error && <div className="text-red-500 py-4">Fehler beim Laden: {error.message}</div>}

      {/* Duplicate List */}
      {data && data.items.length > 0 && (
        <>
          <div className="space-y-2">
            {data.items.map((pair: DuplicatePair) => (
              <div
                key={`${pair.ingredient_a.id}-${pair.ingredient_b.id}`}
                className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <a
                        href={entityUrl(pair.ingredient_a.slug)}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {pair.ingredient_a.name}
                      </a>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={entityUrl(pair.ingredient_b.slug)}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {pair.ingredient_b.name}
                      </a>
                    </div>
                    <span className={cn('text-sm font-semibold', similarityColor(pair.similarity))}>
                      {(pair.similarity * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleOpenMerge(
                          pair.ingredient_a.id,
                          pair.ingredient_a.name,
                          pair.ingredient_a.slug,
                          pair.ingredient_b.id,
                          pair.ingredient_b.name,
                          pair.ingredient_b.slug,
                        )
                      }
                    >
                      <GitMerge className="h-3.5 w-3.5 mr-1" />
                      Zusammenführen
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(pair.ingredient_a.id, pair.ingredient_b.id)}
                      disabled={activeDismissMutation.isPending}
                    >
                      <EyeOff className="h-3.5 w-3.5 mr-1" />
                      Kein Duplikat
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </>
      )}

      {!isLoading && !error && data && data.items.length === 0 && (
        <div className="text-muted-foreground py-4">Keine {entityLabel}-Duplikate gefunden</div>
      )}

      {/* Ingredient Merge Dialog (shared component) */}
      {ingredientMergeSource && ingredientMergeTarget && (
        <IngredientMergeDialog
          open={ingredientMergeOpen}
          onOpenChange={setIngredientMergeOpen}
          currentIngredient={ingredientMergeTarget}
          preSelectedTarget={ingredientMergeSource}
          onMergeComplete={() => {
            setIngredientMergeOpen(false);
            setIngredientMergeSource(null);
            setIngredientMergeTarget(null);
          }}
        />
      )}

      {/* Recipe Merge Preview Dialog */}
      <Dialog open={mergeDialogOpen && !isIngredient} onOpenChange={setMergeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{type === 'ingredient' ? 'Zutaten' : 'Rezepte'} zusammenführen</DialogTitle>
            <DialogDescription>
              {mergePair && (
                <span>
                  <strong>{mergePair.sourceName}</strong> in <strong>{mergePair.targetName}</strong> zusammenführen
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {mergePreviewLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-2xl text-muted-foreground" />
            </div>
          )}

          {mergePreviewError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 text-sm text-red-800 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>Fehler beim Laden der Vorschau: {mergePreviewError instanceof Error ? mergePreviewError.message : 'Unbekannter Fehler'}</span>
            </div>
          )}

          {mergePreview && isIngredient && (
            <IngredientMergePreview preview={mergePreview as MergePreview} />
          )}
          {mergePreview && !isIngredient && (
            <RecipeMergePreview preview={mergePreview as RecipeMergePreview} />
          )}

          {mergePreview && !mergePreviewLoading && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Diese Aktion kann nicht rückgängig gemacht werden. Die Quelldaten werden soft-gelöscht.
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => setMergePair(null)}>
                <XCircle className="h-4 w-4 mr-1" />
                Abbrechen
              </Button>
            </DialogClose>
            <Button
              variant="default"
              onClick={handleConfirmMerge}
              disabled={activeMergeMutation.isPending || mergePreviewLoading || !mergePreview}
            >
              {activeMergeMutation.isPending ? (
                <Loader2 className="animate-spin h-4 w-4 mr-1" />
              ) : (
                <GitMerge className="h-4 w-4 mr-1" />
              )}
              Bestätigen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IngredientMergePreview({ preview }: { preview: MergePreview }) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Betroffene Rezept-Zutaten:</span>
        <span className="font-semibold">{preview.affected_recipe_items}</span>
      </div>

      {preview.source_aliases.length > 0 && (
        <div>
          <span className="text-muted-foreground block mb-1">Aliase der Quelle:</span>
          <div className="flex flex-wrap gap-1">
            {preview.source_aliases.map((a) => (
              <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-xs">{a}</span>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-border pt-2">
        <span className="text-muted-foreground block mb-1">Nährwert-Vergleich:</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">{preview.source_name}</span>
            <div>Energie: {preview.nutrition_comparison.source.energy_kcal != null ? `${Math.round(preview.nutrition_comparison.source.energy_kcal)}` : '–'} kcal</div>
            <div>Protein: {preview.nutrition_comparison.source.protein_g != null ? `${parseFloat(preview.nutrition_comparison.source.protein_g.toFixed(1))}` : '–'} g</div>
          </div>
          <div>
            <span className="text-muted-foreground">{preview.target_name}</span>
            <div>Energie: {preview.nutrition_comparison.target.energy_kcal != null ? `${Math.round(preview.nutrition_comparison.target.energy_kcal)}` : '–'} kcal</div>
            <div>Protein: {preview.nutrition_comparison.target.protein_g != null ? `${parseFloat(preview.nutrition_comparison.target.protein_g.toFixed(1))}` : '–'} g</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RecipeMergePreview({ preview }: { preview: RecipeMergePreview }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">
        Das Quell-Rezept <strong>{preview.source_name}</strong> wird soft-gelöscht und ein ContentLink zu{' '}
        <strong>{preview.target_name}</strong> erstellt.
      </p>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Betroffene Mahlzeit-Verweise:</span>
        <span className="font-semibold">{preview.affected_meal_count}</span>
      </div>
    </div>
  );
}
