import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Info, Loader2, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSuggestionPanel, useSuggestionWand, useUpdateMealPlan } from '@/api/mealPlans';
import type { SuggestionCard, SuggestionFilters, SuggestionPanelResponse } from '@/schemas/mealPlan';
import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';
import { formatEuro } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SuggestionAssistant } from './SuggestionAssistant';
import {
  CONTEXT_LABELS,
  EMPTY_FILTERS,
  RELAXED_FILTER_LABELS,
  chipsForMealType,
  type ContextPatch,
} from './suggestionConfig';

export interface MealSuggestionPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: number;
  mealId: number;
  mealType: string;
  /** Names the slot the cards are added to, e.g. "Snack · Fr., 11.12.". */
  targetLabel?: string;
  /** Items already in the slot; their cards are marked as added (also reflects an undo). */
  addedRecipeIds?: Set<number>;
  addedIngredientIds?: Set<number>;
  onSelectRecipe: (recipeId: number, title: string) => void;
  onSelectIngredient: (
    ingredientId: number,
    portionId: number | null,
    measuringUnitId: number | null,
    quantity: number,
    title: string,
  ) => void;
}

function cardKey(card: SuggestionCard): string {
  return `${card.kind}:${card.id}`;
}

function SuggestionCardButton({
  card,
  added,
  onClick,
}: {
  card: SuggestionCard;
  added: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={added}
      data-testid="suggestion-card"
      className={cn(
        'flex flex-col gap-1 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/50 hover:shadow-sm disabled:opacity-60 disabled:hover:border-border disabled:hover:shadow-none',
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-body font-medium leading-tight line-clamp-2">{card.title}</span>
        {added && <Check className="w-4 h-4 text-success shrink-0" aria-label="Hinzugefügt" />}
      </span>
      <span className="flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-caption font-medium border',
            card.kind === 'ingredient'
              ? 'bg-success-soft text-success border-success-border'
              : 'bg-muted text-muted-foreground border-border',
          )}
        >
          {card.type_label}
        </span>
        {card.is_new && (
          <span className="rounded-full px-2 py-0.5 text-caption font-medium border bg-info-soft text-info border-info-border">
            Neu
          </span>
        )}
        {card.price_per_person != null && (
          <span className="text-caption text-muted-foreground">{formatEuro(card.price_per_person)} / P.</span>
        )}
      </span>
      {card.reason_text && <span className="text-caption text-muted-foreground line-clamp-2">{card.reason_text}</span>}
    </button>
  );
}

export function MealSuggestionPanel({
  open,
  onOpenChange,
  planId,
  mealId,
  mealType,
  targetLabel,
  addedRecipeIds,
  addedIngredientIds,
  onSelectRecipe,
  onSelectIngredient,
}: MealSuggestionPanelProps) {
  const panelMutation = useSuggestionPanel(planId, mealId);
  const wandMutation = useSuggestionWand(planId, mealId);
  const updatePlan = useUpdateMealPlan(planId);

  const [mode, setMode] = useState<'panel' | 'assistant'>('panel');
  const [filters, setFilters] = useState<SuggestionFilters>(EMPTY_FILTERS);
  const [seed, setSeed] = useState<number | null>(null);
  const [wish, setWish] = useState('');
  const [result, setResult] = useState<SuggestionPanelResponse | null>(null);
  const [hasError, setHasError] = useState(false);
  // Latest request wins; a slow older response must not overwrite a newer one.
  const requestId = useRef(0);

  const load = useCallback(
    (nextFilters: SuggestionFilters, nextSeed: number | null) => {
      const current = ++requestId.current;
      setHasError(false);
      panelMutation.mutate(
        { filters: nextFilters, seed: nextSeed },
        {
          onSuccess: (data) => {
            if (current !== requestId.current) return;
            setResult(data);
            setSeed(data.seed);
          },
          onError: () => {
            if (current === requestId.current) setHasError(true);
          },
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panelMutation.mutate],
  );

  const runWand = useCallback(
    (text: string, nextFilters: SuggestionFilters, nextSeed: number | null) => {
      const current = ++requestId.current;
      setHasError(false);
      wandMutation.mutate(
        { freeText: text, filters: nextFilters, seed: nextSeed },
        {
          onSuccess: (data) => {
            if (current !== requestId.current) return;
            setResult(data);
            setSeed(data.seed);
            if (!data.ai_used) {
              toast.info('KI gerade nicht verfügbar', {
                description: 'Die Vorschläge wurden nach Stichwörtern sortiert.',
              });
            }
          },
          onError: (err) => {
            if (current === requestId.current) setHasError(true);
            toast.error('Zauberstab fehlgeschlagen', { description: err.message });
          },
        },
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wandMutation.mutate],
  );

  useEffect(() => {
    if (!open) return;
    setMode('panel');
    setFilters(EMPTY_FILTERS);
    setWish('');
    setResult(null);
    load(EMPTY_FILTERS, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mealId]);

  const toggleChip = (apply: (f: SuggestionFilters) => SuggestionFilters) => {
    const next = apply(filters);
    setFilters(next);
    load(next, seed);
  };

  const reshuffle = () => {
    const nextSeed = Math.floor(Math.random() * 1_000_000) + 1;
    setSeed(nextSeed);
    load(filters, nextSeed);
  };

  const saveContext = (patch: ContextPatch) => {
    updatePlan.mutate(patch, {
      onError: (err) => toast.error('Konnte nicht gespeichert werden', { description: err.message }),
    });
  };

  const finishAssistant = (nextFilters: SuggestionFilters, freeText: string) => {
    setFilters(nextFilters);
    setMode('panel');
    if (freeText.length >= 2) {
      setWish(freeText);
      runWand(freeText, nextFilters, seed);
    } else {
      load(nextFilters, seed);
    }
  };

  const select = (card: SuggestionCard) => {
    if (card.kind === 'recipe') {
      onSelectRecipe(card.id, card.title);
    } else {
      onSelectIngredient(card.id, card.portion_id, card.measuring_unit_id, card.quantity ?? 1, card.title);
    }
  };

  const isLoading = panelMutation.isPending || wandMutation.isPending;
  const mealLabel = MEAL_TYPE_LABELS[mealType] ?? mealType;
  const missingLabels = (result?.missing_context ?? []).map((key) => CONTEXT_LABELS[key] ?? key);
  const relaxedLabels = (result?.relaxed_filters ?? []).map((key) => RELAXED_FILTER_LABELS[key] ?? key);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] max-w-3xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 pb-3 text-left space-y-1">
          <DialogTitle className="flex items-center gap-2 text-section font-display">
            <Sparkles className="w-5 h-5 text-primary" />
            Was passt hier?
          </DialogTitle>
          <DialogDescription className="text-caption">
            {targetLabel ?? mealLabel}: Tippe auf einen Vorschlag, um ihn zu übernehmen.
          </DialogDescription>
        </DialogHeader>

        {mode === 'assistant' ? (
          <div className="overflow-y-auto min-h-0">
            <SuggestionAssistant
              mealType={mealType}
              missingContext={result?.missing_context ?? []}
              initialFilters={filters}
              onSaveContext={saveContext}
              onFinish={finishAssistant}
              onCancel={() => setMode('panel')}
            />
          </div>
        ) : (
          <div className="overflow-y-auto min-h-0">
            <div className="px-4 sm:px-6 pb-3 space-y-3 border-b border-border">
              <div
                className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-1"
                role="group"
                aria-label="Filter"
              >
                {chipsForMealType(mealType).map((chip) => {
                  const active = chip.isActive(filters);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleChip(chip.toggle)}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1 text-caption font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card text-foreground border-border hover:bg-muted/60',
                      )}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (wish.trim().length >= 2) runWand(wish.trim(), filters, seed);
                }}
              >
                <Input
                  value={wish}
                  onChange={(e) => setWish(e.target.value)}
                  placeholder="Wunsch eingeben, z. B. etwas mit Schokolade"
                  aria-label="Wunsch"
                  maxLength={300}
                />
                <Button type="submit" variant="secondary" disabled={wish.trim().length < 2 || isLoading} title="Zauberstab">
                  <Wand2 className="w-4 h-4" />
                  <span className="sr-only sm:not-sr-only sm:ml-1.5">Zauberstab</span>
                </Button>
              </form>

              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setMode('assistant')}>
                  <Sparkles className="w-4 h-4" />
                  <span className="ml-1.5">Assistent starten</span>
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={reshuffle} disabled={isLoading}>
                  <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                  <span className="ml-1.5">Neu mischen</span>
                </Button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              {relaxedLabels.length > 0 && (
                <p className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-soft p-2.5 text-caption text-warning">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  Nur {result?.total ?? 0} Treffer, deshalb gelockert: {relaxedLabels.join(', ')}.
                </p>
              )}
              {missingLabels.length > 0 && (
                <p className="flex items-start gap-2 rounded-lg border border-info-border bg-info-soft p-2.5 text-caption text-info">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Kontext ergänzen für bessere Vorschläge: {missingLabels.join(', ')}.{' '}
                    <button type="button" className="underline font-medium" onClick={() => setMode('assistant')}>
                      Assistent starten
                    </button>
                  </span>
                </p>
              )}

              {hasError && (
                <div className="rounded-xl border border-danger-border bg-danger-soft p-4 text-body text-danger">
                  Die Vorschläge konnten nicht geladen werden.{' '}
                  <button type="button" className="underline font-medium" onClick={() => load(filters, seed)}>
                    Erneut versuchen
                  </button>
                </div>
              )}

              {isLoading && !result && (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Vorschläge werden gesucht …
                </div>
              )}

              {result && result.total === 0 && !isLoading && (
                <p className="py-8 text-center text-body text-muted-foreground">
                  Keine Vorschläge gefunden. Probiere weniger Filter oder „Neu mischen“.
                </p>
              )}

              {result?.directions
                .filter((direction) => direction.cards.length > 0)
                .map((direction) => (
                  <section key={direction.key} aria-label={direction.label} className={cn(isLoading && 'opacity-60')}>
                    <h3 className="text-emphasis font-display font-semibold">{direction.label}</h3>
                    {direction.hint && <p className="text-caption text-muted-foreground mb-2">{direction.hint}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {direction.cards.map((card) => (
                        <SuggestionCardButton
                          key={cardKey(card)}
                          card={card}
                          added={
                            card.kind === 'recipe'
                              ? (addedRecipeIds?.has(card.id) ?? false)
                              : (addedIngredientIds?.has(card.id) ?? false)
                          }
                          onClick={() => select(card)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
