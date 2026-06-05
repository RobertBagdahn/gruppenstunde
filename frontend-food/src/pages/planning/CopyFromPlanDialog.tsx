import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, ClipboardCopy } from 'lucide-react';
import { useMealPlans, useMealPlan, useCopyItemsFromPlan } from '@/api/mealPlans';
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

type Step = 'plan' | 'day' | 'meal' | 'items';

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
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());

  const { data: plans, isLoading: plansLoading } = useMealPlans();
  const { data: sourcePlanDetail } = useMealPlan(selectedPlanId ?? 0);

  const copyMutation = useCopyItemsFromPlan(targetPlanId);

  const availablePlans = useMemo(() => {
    if (!plans) return [];
    return plans.filter((p) => p.id !== targetPlanId && p.meals_count > 0);
  }, [plans, targetPlanId]);

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
      sourcePlanDetail.meals.filter(
        (m) => m.start_datetime?.startsWith(selectedDate) && !m.is_synced,
      ),
    );
  }, [sourcePlanDetail, selectedDate]);

  const selectedMeal = useMemo(() => {
    if (!sourcePlanDetail?.meals || !selectedMealId) return null;
    return sourcePlanDetail.meals.find((m) => m.id === selectedMealId) ?? null;
  }, [sourcePlanDetail, selectedMealId]);

  const totalSelectedItems = selectedItemIds.size;
  const allItemCount = selectedMeal?.items.length ?? 0;

  const handleSelectPlan = (planId: number) => {
    setSelectedPlanId(planId);
    setSelectedDate(null);
    setSelectedMealId(null);
    setSelectedItemIds(new Set());
    setStep('day');
  };

  const handleSelectDay = (date: string) => {
    setSelectedDate(date);
    setSelectedMealId(null);
    setSelectedItemIds(new Set());
    setStep('meal');
  };

  const handleSelectMeal = (mealId: number) => {
    setSelectedMealId(mealId);
    setSelectedItemIds(new Set());
    setStep('items');
  };

  const toggleItem = (itemId: number) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleBack = () => {
    if (step === 'day') {
      setStep('plan');
      setSelectedPlanId(null);
    } else if (step === 'meal') {
      setStep('day');
      setSelectedDate(null);
    } else if (step === 'items') {
      setStep('meal');
      setSelectedMealId(null);
    }
  };

  const handleCopy = () => {
    if (!selectedMealId) return;
    const itemIds = selectedItemIds.size > 0 ? Array.from(selectedItemIds) : undefined;

    copyMutation.mutate(
      {
        mealId: targetMealId,
        source_plan_id: selectedPlanId!,
        source_meal_id: selectedMealId,
        item_ids: itemIds,
      },
      {
        onSuccess: (data) => {
          toast.success(`${data.length} ${data.length === 1 ? 'Eintrag wurde' : 'Einträge wurden'} kopiert`);
          onOpenChange(false);
          resetState();
        },
        onError: (err: any) => {
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
    setSelectedItemIds(new Set());
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
      case 'items': return 'Einträge auswählen';
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
          {/* Step 1: Plan selection */}
          {step === 'plan' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Wähle einen Essensplan als Quelle:
              </p>
              {plansLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : availablePlans.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Keine anderen Essenspläne vorhanden.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {availablePlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan.id)}
                      className="w-full text-left px-3 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{plan.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {plan.meals_count} Mahlzeiten
                          {plan.start_datetime && plan.end_datetime && (
                            <> · {formatDateShort(plan.start_datetime.slice(0, 10))} – {formatDateShort(plan.end_datetime.slice(0, 10))}</>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Day selection */}
          {step === 'day' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Wähle einen Tag aus <span className="font-medium text-foreground">{plans?.find((p) => p.id === selectedPlanId)?.name}</span>:
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

          {/* Step 3: Meal selection */}
          {step === 'meal' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Wähle eine Mahlzeit aus:
              </p>
              {dayMeals.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Keine Mahlzeiten an diesem Tag.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {dayMeals.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMeal(m.id)}
                      className="w-full text-left px-3 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors flex items-center justify-between"
                    >
                      <span className="font-medium text-sm">
                        {MEAL_TYPE_LABELS[m.meal_type] || m.meal_type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {m.items.length} {m.items.length === 1 ? 'Eintrag' : 'Einträge'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Item selection */}
          {step === 'items' && selectedMeal && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Wähle Einträge aus <span className="font-medium text-foreground">{MEAL_TYPE_LABELS[selectedMeal.meal_type] || selectedMeal.meal_type}</span>:
              </p>
              {selectedMeal.items.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Diese Mahlzeit hat keine Einträge.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selectedMeal.items.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors",
                        selectedItemIds.has(item.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedItemIds.has(item.id)}
                        onChange={() => toggleItem(item.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {item.recipe_title || item.ingredient_name || item.display_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.factor !== 1.0 && <>Faktor {item.factor.toFixed(1).replace('.', ',')}</>}
                          {item.energy_kj != null && (
                            <> · {Math.round(item.energy_kj / 4.184)} kcal</>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Abbrechen
          </Button>
          {step === 'items' && selectedMeal && selectedMeal.items.length > 0 && (
            <Button
              onClick={handleCopy}
              disabled={isPending || (selectedItemIds.size === 0 && selectedMeal.items.length > 0)}
            >
              <ClipboardCopy className="w-4 h-4 mr-2" />
              {isPending
                ? 'Kopieren...'
                : `Kopieren (${totalSelectedItems > 0 ? totalSelectedItems : allItemCount} ${(totalSelectedItems > 0 ? totalSelectedItems : allItemCount) === 1 ? 'Eintrag' : 'Einträge'})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
