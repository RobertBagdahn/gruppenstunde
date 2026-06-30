import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, ClipboardCopy, Search, Calendar } from 'lucide-react';
import { useMealPlansSearch, useMealPlan, useCopyItemsFromPlan } from '@/api/mealPlans';
import {
  MEAL_TYPE_LABELS,
  MEAL_TYPE_ORDER,
} from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CopyFromPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetMealId: number;
  targetPlanId: number;
}

type Step = 'plan' | 'day' | 'meal';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

function sortMealsByType(meals: Meal[]): Meal[] {
  return [...meals].sort((a, b) => {
    const getOrder = (mt: string) => {
      const idx = MEAL_TYPE_ORDER.indexOf(mt as typeof MEAL_TYPE_ORDER[number]);
      return idx === -1 ? 999 : idx;
    };
    return getOrder(a.meal_type) - getOrder(b.meal_type);
  });
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start.slice(0, 10));
  const e = new Date(end.slice(0, 10));
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function mealKcalSum(meal: Meal, normPortions: number): number {
  return Math.round(
    meal.items.reduce((sum, item) => sum + (item.energy_kcal ?? 0) / normPortions, 0),
  );
}

export function CopyFromPlanDialog({
  open,
  onOpenChange,
  targetMealId,
  targetPlanId,
}: CopyFromPlanDialogProps) {
  const [step, setStep] = useState<Step>('plan');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedMealId, setSelectedMealId] = useState<number | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: plans, isLoading: plansLoading } = useMealPlansSearch(
    searchQuery || undefined,
    dateFrom || undefined,
    dateTo || undefined,
  );
  const { data: sourcePlanDetail } = useMealPlan(selectedPlanId ?? 0);

  const copyMutation = useCopyItemsFromPlan(targetPlanId);

  const days = useMemo(() => {
    if (!sourcePlanDetail?.meals) return [];
    const dateSet = new Set<string>();
    for (const meal of sourcePlanDetail.meals) {
      if (meal.start_datetime) {
        dateSet.add(meal.start_datetime.slice(0, 10));
      }
    }
    return Array.from(dateSet).sort();
  }, [sourcePlanDetail]);

  const dayMeals = useMemo(() => {
    if (!sourcePlanDetail?.meals || !selectedDate) return [];
    return sortMealsByType(
      sourcePlanDetail.meals.filter((m) => m.start_datetime?.startsWith(selectedDate)),
    );
  }, [sourcePlanDetail, selectedDate]);

  const selectedMeal = useMemo(() => {
    if (!sourcePlanDetail?.meals || !selectedMealId) return null;
    return sourcePlanDetail.meals.find((m) => m.id === selectedMealId) ?? null;
  }, [sourcePlanDetail, selectedMealId]);

  const selectedPlan = useMemo(() => {
    if (!plans || !selectedPlanId) return null;
    return plans.find((p) => p.id === selectedPlanId) ?? null;
  }, [plans, selectedPlanId]);

  const handleSelectPlan = (planId: number) => {
    setSelectedPlanId(planId);
    setSelectedDate(null);
    setSelectedMealId(null);
    setStep('day');
  };

  const handleSelectDay = (date: string) => {
    setSelectedDate(date);
    setSelectedMealId(null);
    setStep('meal');
  };

  const handleBack = () => {
    if (step === 'day') {
      setStep('plan');
      setSelectedPlanId(null);
    } else if (step === 'meal') {
      setStep('day');
      setSelectedMealId(null);
    }
  };

  const handleCopy = () => {
    if (!selectedMealId || !selectedPlan) return;

    copyMutation.mutate(
      {
        mealId: targetMealId,
        source_plan_id: selectedPlanId!,
        source_meal_id: selectedMealId,
        note: selectedPlan.name,
      },
      {
        onSuccess: (data) => {
          toast.success(`${data.length} ${data.length === 1 ? 'Eintrag wurde' : 'Einträge wurden'} kopiert`);
          onOpenChange(false);
          resetState();
        },
        onError: (err: Error) => {
          toast.error('Fehler beim Kopieren', { description: err.message });
        },
      },
    );
  };

  const resetState = () => {
    setStep('plan');
    setSelectedPlanId(null);
    setSelectedDate(null);
    setSelectedMealId(null);
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const isPending = copyMutation.isPending;

  const dialogTitle = () => {
    switch (step) {
      case 'plan': return 'Aus anderem Plan kopieren';
      case 'day': return 'Tag auswählen';
      case 'meal': return 'Mahlzeit auswählen';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step !== 'plan' && (
              <button
                onClick={handleBack}
                className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted/10 transition-colors"
                title="Zurück"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <DialogTitle>{dialogTitle()}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 my-4 space-y-4">
          {/* Step 1: Plan selection with search & date filter */}
          {step === 'plan' && (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Pläne durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                />
              </div>

              {/* Date range filter */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  title="Von"
                />
                <span className="text-muted-foreground text-sm">–</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                  title="Bis"
                />
              </div>

              {/* Plan list */}
              <p className="text-sm text-muted-foreground">
                Wähle einen Essensplan als Quelle:
              </p>
              {plansLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : !plans || plans.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Keine Essenspläne gefunden.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {plans.map((plan) => {
                    const daysCount =
                      plan.start_datetime && plan.end_datetime
                        ? daysBetween(plan.start_datetime, plan.end_datetime)
                        : null;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => handleSelectPlan(plan.id)}
                        className="w-full text-left px-3 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{plan.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 space-x-2">
                            {plan.start_datetime && plan.end_datetime && (
                              <span>
                                {formatDateShort(plan.start_datetime)} – {formatDateShort(plan.end_datetime)}
                              </span>
                            )}
                            {daysCount && <span>· {daysCount} {daysCount === 1 ? 'Tag' : 'Tage'}</span>}
                            <span>· {plan.meals_count} {plan.meals_count === 1 ? 'Mahlzeit' : 'Mahlzeiten'}</span>
                          </div>
                          {plan.event_name && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {plan.event_name}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Day selection */}
          {step === 'day' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Wähle einen Tag aus <span className="font-medium text-foreground">{selectedPlan?.name}</span>:
              </p>
              {days.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Keine Tage mit Mahlzeiten vorhanden.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {days.map((date) => (
                    <button
                      key={date}
                      onClick={() => handleSelectDay(date)}
                      className="w-full text-left px-3 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-medium text-sm">{formatDate(date)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Meal selection with preview */}
          {step === 'meal' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Wähle eine Mahlzeit aus <span className="font-medium text-foreground">{selectedDate ? formatDate(selectedDate) : ''}</span>:
              </p>
              {dayMeals.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Keine Mahlzeiten an diesem Tag.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {dayMeals.map((m) => {
                    const kcalSum = mealKcalSum(m, sourcePlanDetail?.norm_portions ?? 1);
                    const isSelected = selectedMealId === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMealId(m.id)}
                        className={cn(
                          "w-full text-left px-3 py-3 rounded-lg border transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {MEAL_TYPE_LABELS[m.meal_type] || m.meal_type}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {m.items.length} {m.items.length === 1 ? 'Eintrag' : 'Einträge'} · {kcalSum} kcal
                          </span>
                        </div>
                        {/* Preview when selected */}
                        {isSelected && m.items.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border space-y-1">
                            {m.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="truncate mr-2">
                                  {item.recipe_title || item.ingredient_name || item.display_name}
                                </span>
                                <span className="flex-shrink-0">
                                  {item.factor !== 1.0 && <>×{item.factor.toFixed(1).replace('.', ',')} · </>}
                                  {item.energy_kcal != null && <>{Math.round(item.energy_kcal / (sourcePlanDetail?.norm_portions ?? 1))} kcal</>}
                                </span>
                              </div>
                            ))}
                            <div className="flex items-center justify-between text-xs font-medium text-foreground pt-1 border-t border-border">
                              <span>Summe</span>
                              <span>{kcalSum} kcal</span>
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Abbrechen
          </Button>
          {step === 'meal' && selectedMeal && (
            <Button
              onClick={handleCopy}
              disabled={isPending}
            >
              <ClipboardCopy className="w-4 h-4 mr-2" />
              {isPending
                ? 'Kopieren...'
                : `Kopieren (${selectedMeal.items.length} ${selectedMeal.items.length === 1 ? 'Eintrag' : 'Einträge'})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
