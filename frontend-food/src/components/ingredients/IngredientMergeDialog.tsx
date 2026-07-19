import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  useMergePreview,
  useMergeIngredients,
} from '@/api/dataQuality';
import {
  useSimilarIngredients,
  useIngredientSearch,
} from '@/api/supplies';
import type { MergePreview } from '@/schemas/dataQuality';
import type { IngredientSimilar } from '@/schemas/supply';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, GitMerge, ArrowRight, ArrowLeftRight, ArrowLeft, AlertTriangle, Search, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface InlineIngredient {
  id: number;
  name: string;
  slug: string;
}

interface IngredientMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentIngredient: InlineIngredient;
  /** Pre-selected second ingredient (e.g. from duplicate detection). If set, skips the search step. */
  preSelectedTarget?: InlineIngredient | null;
  /** Called after a successful merge. */
  onMergeComplete?: () => void;
}

type Step = 'search' | 'confirm';

export default function IngredientMergeDialog({
  open,
  onOpenChange,
  currentIngredient,
  preSelectedTarget,
  onMergeComplete,
}: IngredientMergeDialogProps) {
  const navigate = useNavigate();
  const mergeMutation = useMergeIngredients();

  const [step, setStep] = useState<Step>('search');
  const [searchText, setSearchText] = useState('');
  const [sourceIngredient, setSourceIngredient] = useState<InlineIngredient>(currentIngredient);
  const [targetIngredient, setTargetIngredient] = useState<InlineIngredient>(currentIngredient);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (open && preSelectedTarget) {
      setSourceIngredient(preSelectedTarget);
      setTargetIngredient(currentIngredient);
      setStep('confirm');
    }
  }, [open, preSelectedTarget, currentIngredient]);

  const similarQuery = useSimilarIngredients(currentIngredient.slug);
  const searchQuery = useIngredientSearch(
    { name: searchText, page_size: 10 },
    searchText.length >= 2,
  );
  const mergePreviewQuery = useMergePreview(
    sourceIngredient.id === targetIngredient.id ? 0 : sourceIngredient.id,
    sourceIngredient.id === targetIngredient.id ? 0 : targetIngredient.id,
  );

  const reset = useCallback(() => {
    setStep('search');
    setSearchText('');
    setSourceIngredient(currentIngredient);
    setTargetIngredient(currentIngredient);
    setConfirmed(false);
  }, [currentIngredient]);

  const handleSelectIngredient = useCallback((ingredient: InlineIngredient) => {
    if (ingredient.id === currentIngredient.id) {
      toast.error('Kann nicht mit sich selbst zusammengeführt werden');
      return;
    }
    setSourceIngredient(ingredient);
    setTargetIngredient(currentIngredient);
    setStep('confirm');
  }, [currentIngredient]);

  const handleSwap = useCallback(() => {
    setSourceIngredient(targetIngredient);
    setTargetIngredient(sourceIngredient);
  }, [sourceIngredient, targetIngredient]);

  const handleConfirmMerge = useCallback(async () => {
    try {
      const result = await mergeMutation.mutateAsync({
        source_id: sourceIngredient.id,
        target_id: targetIngredient.id,
      });
      toast.success(
        `Zutaten zusammengeführt: ${result.affected_recipe_items} Rezepte aktualisiert, ${result.portions_moved} Portionen übernommen, ${result.aliases_added} Aliase hinzugefügt`
      );
      onOpenChange(false);
      reset();
      onMergeComplete?.();
      if (targetIngredient.id === currentIngredient.id) {
        navigate(`/ingredients/${targetIngredient.slug}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Zusammenführen');
    }
  }, [sourceIngredient, targetIngredient, mergeMutation, onOpenChange, reset, onMergeComplete, navigate, currentIngredient]);

  const handleClose = useCallback((open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  }, [onOpenChange, reset]);

  const handleGoBack = useCallback(() => {
    setStep('search');
  }, []);

  const suggestions = useMemo(() => {
    if (searchText.length >= 2) {
      const items = searchQuery.data?.items || [];
      return items.filter((i) => i.id !== currentIngredient.id) as InlineIngredient[];
    }
    return [];
  }, [searchText, searchQuery.data, currentIngredient.id]);

  const embeddedSuggestions = useMemo(() => {
    if (!similarQuery.data) return [];
    return similarQuery.data.filter((s) => s.id !== currentIngredient.id) as IngredientSimilar[];
  }, [similarQuery.data, currentIngredient.id]);

  const preview = mergePreviewQuery.data as MergePreview | undefined;
  const usageCount = typeof preview === 'object' && 'affected_recipe_items' in (preview || {}) ? preview.affected_recipe_items : 0;
  const needsWarning = usageCount > 20;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'search' ? 'Zutat zum Zusammenführen suchen' : 'Zusammenführen bestätigen'}
          </DialogTitle>
          <DialogDescription>
            {step === 'search'
              ? 'Wähle eine zweite Zutat, die mit der aktuellen zusammengeführt werden soll.'
              : 'Überprüfe die Details und bestätige den Vorgang.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zutat suchen..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {searchText.length < 2 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Ähnliche Zutaten (Embedding-basiert):</p>
                {similarQuery.isLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin text-muted-foreground" />
                  </div>
                )}
                {embeddedSuggestions.length > 0 ? (
                  <div className="space-y-1">
                    {embeddedSuggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          handleSelectIngredient({ id: s.id, name: s.name, slug: s.slug })
                        }
                        className="w-full flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(100 - s.distance * 100).toFixed(0)}%
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  !similarQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">
                      Keine ähnlichen Zutaten gefunden. Nutze die Suche.
                    </p>
                  )
                )}
              </div>
            )}

            {searchText.length >= 2 && (
              <div className="space-y-1">
                {searchQuery.isLoading && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin text-muted-foreground" />
                  </div>
                )}
                {suggestions.length > 0 ? (
                  suggestions.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectIngredient(item)}
                      className="w-full flex items-center justify-between rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="font-medium">{item.name}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))
                ) : (
                  !searchQuery.isLoading && (
                    <p className="text-sm text-muted-foreground">Keine Ergebnisse</p>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 py-2">
              <div className="text-center">
                <span className={cn(
                  'text-sm font-semibold px-3 py-1 rounded-full',
                  'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                )}>
                  {sourceIngredient.name}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Quelle (wird gelöscht)</p>
              </div>
              <button
                onClick={handleSwap}
                className="p-1 rounded-full hover:bg-muted transition-colors"
                title="Quelle und Ziel tauschen"
              >
                <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              </button>
              <div className="text-center">
                <span className="text-sm font-semibold px-3 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300">
                  {targetIngredient.name}
                </span>
                <p className="text-xs text-muted-foreground mt-1">Ziel (bleibt erhalten)</p>
              </div>
            </div>

            {mergePreviewQuery.isLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-muted-foreground" />
              </div>
            )}

            {mergePreviewQuery.isError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 text-sm text-red-800 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">Fehler beim Laden der Vorschau: {mergePreviewQuery.error instanceof Error ? mergePreviewQuery.error.message : 'Unbekannter Fehler'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-0 px-2 text-red-800 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/40"
                  onClick={() => mergePreviewQuery.refetch()}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Wiederholen
                </Button>
              </div>
            )}

            {preview && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                  <span className="text-muted-foreground">Betroffene Rezepte:</span>
                  <span className="font-semibold">{preview.affected_recipe_items}</span>
                </div>
              </div>
            )}

            {needsWarning && (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    Diese Zutat wird in über 20 Rezepten verwendet. Das Zusammenführen kann viele Rezepte beeinflussen.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300 cursor-pointer">
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={(v) => setConfirmed(v === true)}
                  />
                  Ich bin sicher
                </label>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 text-sm text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Diese Aktion kann nicht rückgängig gemacht werden. Die Quelldaten werden soft-gelöscht.
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'confirm' ? (
            <Button variant="outline" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Zurück
            </Button>
          ) : (
            <DialogClose asChild>
              <Button variant="outline">
                <XCircle className="h-4 w-4 mr-1" />
                Abbrechen
              </Button>
            </DialogClose>
          )}
          {step === 'confirm' && (
            <Button
              variant="default"
              onClick={handleConfirmMerge}
              disabled={
                mergeMutation.isPending ||
                mergePreviewQuery.isLoading ||
                mergePreviewQuery.isError ||
                !preview ||
                (needsWarning && !confirmed) ||
                sourceIngredient.id === targetIngredient.id
              }
            >
              {mergeMutation.isPending || mergePreviewQuery.isLoading ? (
                <Loader2 className="animate-spin h-4 w-4 mr-1" />
              ) : (
                <GitMerge className="h-4 w-4 mr-1" />
              )}
              Zusammenführen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
