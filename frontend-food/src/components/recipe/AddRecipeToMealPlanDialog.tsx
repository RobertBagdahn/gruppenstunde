import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useAddMealItem, useMealPlan, useMealPlans, useRemoveMealItem } from '@/api/mealPlans';
import { CreateMealPlanDialog } from '@/components/planning/CreateMealPlanDialog';
import { MEAL_TYPE_LABELS, type Meal } from '@/schemas/mealPlan';
import { mealTargetLabel } from '@/lib/mealTargetLabel';
import { parseDecimalInput } from '@/lib/decimalInput';
import { notify, UNDO_DURATION_MS } from '@/lib/notify';

const LAST_PLAN_KEY = 'inspi-food:last-recipe-target-plan';

function readLastPlanId(): number | null {
  try {
    const raw = localStorage.getItem(LAST_PLAN_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isInteger(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function rememberPlanId(planId: number): void {
  try {
    localStorage.setItem(LAST_PLAN_KEY, String(planId));
  } catch {
    // Remembering the plan is a convenience only.
  }
}

function dayLabel(meal: Meal): string {
  if (!meal.start_datetime) return 'Ohne Datum';
  return new Date(meal.start_datetime).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

interface AddRecipeToMealPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: number;
  recipeTitle: string;
}

/** Plan → meals (multi-select) → servings: puts a recipe into one or more meals of an editable plan. */
export default function AddRecipeToMealPlanDialog({ open, onOpenChange, recipeId, recipeTitle }: AddRecipeToMealPlanDialogProps) {
  const navigate = useNavigate();
  const { data: plans = [], isLoading: plansLoading } = useMealPlans({}, { enabled: open });
  const editablePlans = useMemo(() => plans.filter((plan) => plan.can_edit && !plan.is_template), [plans]);

  const [planId, setPlanId] = useState<number | null>(null);
  const [selectedMealIds, setSelectedMealIds] = useState<Set<number>>(new Set());
  const [portionsInput, setPortionsInput] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const plan = editablePlans.find((candidate) => candidate.id === planId) ?? null;
  const { data: detail, isLoading: detailLoading } = useMealPlan(planId ?? 0);
  const addItem = useAddMealItem(planId ?? 0);
  const removeItem = useRemoveMealItem(planId ?? 0);

  // Preselect the last used plan, or the only one.
  useEffect(() => {
    if (!open || planId !== null || editablePlans.length === 0) return;
    const last = readLastPlanId();
    const preferred = editablePlans.find((candidate) => candidate.id === last) ?? (editablePlans.length === 1 ? editablePlans[0] : null);
    if (preferred) setPlanId(preferred.id);
  }, [open, planId, editablePlans]);

  useEffect(() => {
    if (open) return;
    setSelectedMealIds(new Set());
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (plan) setPortionsInput(String(plan.norm_portions));
    setSelectedMealIds(new Set());
  }, [plan?.id, plan?.norm_portions]); // eslint-disable-line react-hooks/exhaustive-deps

  const meals = useMemo(
    () => [...(detail?.meals ?? [])].sort((a, b) => (a.start_datetime ?? '').localeCompare(b.start_datetime ?? '')),
    [detail?.meals],
  );
  const mealsByDay = useMemo(() => {
    const groups = new Map<string, Meal[]>();
    for (const meal of meals) {
      const key = dayLabel(meal);
      groups.set(key, [...(groups.get(key) ?? []), meal]);
    }
    return [...groups.entries()];
  }, [meals]);

  const portions = parseDecimalInput(portionsInput);
  const validPortions = portions !== null && portions >= 1 ? portions : null;

  const toggleMeal = (mealId: number, checked: boolean) => {
    setSelectedMealIds((current) => {
      const next = new Set(current);
      if (checked) next.add(mealId);
      else next.delete(mealId);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (!plan || validPortions === null || selectedMealIds.size === 0) return;
    setSaving(true);
    const factor = plan.norm_portions > 0 && validPortions !== plan.norm_portions ? validPortions / plan.norm_portions : undefined;
    const createdItemIds: number[] = [];
    const failed: string[] = [];
    for (const mealId of selectedMealIds) {
      const meal = meals.find((candidate) => candidate.id === mealId);
      try {
        const item = await addItem.mutateAsync({ mealId, recipe_id: recipeId, ...(factor ? { factor } : {}) });
        createdItemIds.push(item.id);
      } catch {
        failed.push(meal ? mealTargetLabel(meal) : String(mealId));
      }
    }
    setSaving(false);
    rememberPlanId(plan.id);
    if (failed.length > 0) {
      notify.failed('Rezept', 'hinzugefügt', undefined, { description: `Nicht hinzugefügt: ${failed.join(', ')}` });
    }
    if (createdItemIds.length === 0) return;
    onOpenChange(false);
    notify.success(
      createdItemIds.length === 1 ? 'Rezept zum Essensplan hinzugefügt' : `Rezept zu ${createdItemIds.length} Mahlzeiten hinzugefügt`,
      {
        description: `${recipeTitle} · ${plan.name}`,
        duration: UNDO_DURATION_MS,
        action: { label: 'Zum Plan', onClick: () => navigate(`/meal-plans/${plan.id}`) },
        cancel: {
          label: 'Rückgängig',
          onClick: () => {
            void Promise.all(createdItemIds.map((itemId) => removeItem.mutateAsync(itemId))).catch((cause: unknown) =>
              notify.failed('Eintrag', 'entfernt', cause),
            );
          },
        },
      },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-section font-display">
              <CalendarPlus className="h-5 w-5 text-primary" aria-hidden="true" />
              Zum Essensplan hinzufügen
            </DialogTitle>
            <DialogDescription className="text-body text-muted-foreground break-words">{recipeTitle}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {plansLoading ? (
              <div className="space-y-2" role="status" aria-label="Pläne werden geladen">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
              </div>
            ) : editablePlans.length === 0 ? (
              <div className="space-y-3 rounded-xl bg-muted/40 p-4 text-body">
                <p className="text-muted-foreground">Du hast noch keinen Essensplan, in den du Rezepte legen darfst.</p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Neuen Plan anlegen
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="add-recipe-plan" className="text-body font-medium">Essensplan</label>
                  <select
                    id="add-recipe-plan"
                    value={planId ?? ''}
                    onChange={(event) => setPlanId(event.target.value ? Number(event.target.value) : null)}
                    className="mt-1 w-full rounded-lg border bg-card px-3 py-2.5 text-body focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Plan wählen …</option>
                    {editablePlans.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="mt-1 text-caption font-semibold text-primary hover:underline"
                  >
                    Neuen Plan anlegen
                  </button>
                </div>

                {plan && (
                  <fieldset className="space-y-3">
                    <legend className="text-body font-medium">Mahlzeiten</legend>
                    {detailLoading ? (
                      <Skeleton className="h-24 w-full" />
                    ) : mealsByDay.length === 0 ? (
                      <p className="text-body text-muted-foreground">Dieser Plan hat noch keine Mahlzeiten.</p>
                    ) : (
                      mealsByDay.map(([day, dayMeals]) => (
                        <div key={day} className="space-y-1.5">
                          <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{day}</p>
                          {dayMeals.map((meal) => {
                            const alreadyIn = meal.items.some((item) => item.recipe_id === recipeId);
                            const id = `add-recipe-meal-${meal.id}`;
                            return (
                              <label
                                key={meal.id}
                                htmlFor={id}
                                className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-body ${alreadyIn ? 'opacity-60' : 'cursor-pointer hover:bg-muted/40'}`}
                              >
                                <Checkbox
                                  id={id}
                                  checked={selectedMealIds.has(meal.id)}
                                  disabled={alreadyIn}
                                  onCheckedChange={(checked) => toggleMeal(meal.id, checked === true)}
                                />
                                <span className="min-w-0 flex-1">{MEAL_TYPE_LABELS[meal.meal_type] ?? meal.display_name ?? meal.meal_type}</span>
                                {alreadyIn && <span className="shrink-0 text-caption text-muted-foreground">Bereits enthalten</span>}
                              </label>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </fieldset>
                )}

                {plan && (
                  <div>
                    <label htmlFor="add-recipe-portions" className="text-body font-medium">Portionen</label>
                    <input
                      id="add-recipe-portions"
                      type="text"
                      inputMode="decimal"
                      value={portionsInput}
                      onChange={(event) => setPortionsInput(event.target.value)}
                      aria-invalid={validPortions === null}
                      className="mt-1 w-full rounded-lg border px-3 py-2.5 text-emphasis focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="mt-1 text-caption text-muted-foreground">Vorbelegt mit den Normportionen des Plans ({plan.norm_portions}).</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t pt-3">
            <button type="button" onClick={() => onOpenChange(false)} className="rounded-lg border px-4 py-2 text-body hover:bg-muted">
              Abbrechen
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={!plan || selectedMealIds.size === 0 || validPortions === null || saving}
              className="rounded-lg bg-primary px-4 py-2 text-body font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Wird hinzugefügt …' : selectedMealIds.size > 1 ? `In ${selectedMealIds.size} Mahlzeiten legen` : 'Hinzufügen'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <CreateMealPlanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(newPlanId) => {
          setCreateOpen(false);
          setPlanId(newPlanId);
        }}
      />
    </>
  );
}
