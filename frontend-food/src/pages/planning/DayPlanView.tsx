import { useState } from 'react';
import type { MealItemUpdateHandler } from '@/components/planning/MealItemAmountEditor';
import { Plus, Trash2 } from 'lucide-react';
import { useReorderMeals } from '@/api/mealPlans';
import { useCreateTrip, useTripPlan, useUpdateTrip } from '@/api/shoppingTrips';
import DayTripMarker from '@/components/planning/DayTripMarker';
import LinkEventDialog, { type LinkEventPlan } from '@/components/planning/LinkEventDialog';
import TripFormDialog, { type TripFormValues } from '@/components/shopping/trips/TripFormDialog';
import { mergeDayEntries, tripsOfDay } from '@/lib/dayEntries';
import type { PlannedTrip } from '@/schemas/shoppingTrip';
import { useNavigate } from 'react-router-dom';
import { notify } from '@/lib/notify';
import { MealSlot } from './MealSlot';
import { MEAL_TYPE_ORDER, MEAL_TYPE_LABELS, NORM_PERSON_DAILY_KCAL, getDayCoverage, getCoverageBadge, effectivePortions } from '@/schemas/mealPlan';
import type { Meal, RefMeal } from '@/schemas/mealPlan';
import { RefMealChips } from '@/components/planning/RefMealChips';
import EmptyState from '@/components/shared/EmptyState';
import RecipeSearchDialog from './RecipeSearchDialog';
import { formatCount, formatNumber } from '@/lib/format';
import { Icon } from '@/components/ui/icon';

export function DayPlanView({
  mealPlanId,
  refMeals = [],
  dayGroups,
  canEdit,
  hasTimeframe,
  normPortions,
  budgetPerPersonPerDay,
  onAddDayBefore,
  addDayBeforePending,
  onAddDayAfter,
  addDayAfterPending,
  onDeleteDay,
  onAddMealType,
  onDeleteMeal,
  onAddRecipe,
  onAddIngredient,
  onActivateMeal,
  onDeleteItem,
  onUpdateItemFactor,
  onUpdateItem,
  onUpdateMeal,
  onScaleMeal,
  onCopyFromPlan,
  nutritionalTagIds,
  nutritionalTagNames,
  tripPlanning,
}: {
  mealPlanId: number;
  refMeals?: RefMeal[];
  dayGroups: { date: string; meals: Meal[] }[];
  canEdit: boolean;
  hasTimeframe: boolean;
  normPortions: number;
  budgetPerPersonPerDay?: number | null;
  onAddDayBefore: () => void;
  addDayBeforePending: boolean;
  onAddDayAfter: () => void;
  addDayAfterPending: boolean;
  onDeleteDay: (date: string) => void;
  onAddMealType: (date: string, mealType: string) => Promise<Meal>;
  onDeleteMeal: (id: number) => void;
  onAddRecipe: (mealId: number, recipeId: number) => void;
  onAddIngredient: (mealId: number, ingredientId: number, portionId: number | null, measuringUnitId: number | null, quantity: number, note?: string) => void;
  onActivateMeal?: (mealId: number) => void;
  onDeleteItem: (id: number) => void;
  onUpdateItemFactor: (itemId: number, factor: number) => void;
  onUpdateItem?: MealItemUpdateHandler;
  onUpdateMeal: (mealId: number, data: {
    note?: string | null;
    override_portions?: number | null;
    day_part_factor?: number | null;
    is_external?: boolean | null;
    external_energy_kcal?: number | null;
    external_cost_per_person?: number | null;
    start_datetime?: string | null;
    end_datetime?: string | null;
  }) => void;
  onScaleMeal: (mealId: number) => void;
  onCopyFromPlan: (mealId: number) => void;
  nutritionalTagIds?: number[];
  nutritionalTagNames?: string[];
  /** Shopping trips of the plan's event; `eventSlug` is empty while the plan has no event. */
  tripPlanning?: { eventSlug: string; plan: Omit<LinkEventPlan, 'id'> };
}) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const [searchDialogMeal, setSearchDialogMeal] = useState<Meal | null>(null);
  const reorderMutation = useReorderMeals(mealPlanId);
  const navigate = useNavigate();
  const eventSlug = tripPlanning?.eventSlug ?? '';
  const tripPlan = useTripPlan(eventSlug, eventSlug !== '');
  const createTrip = useCreateTrip(eventSlug);
  const updateTrip = useUpdateTrip(eventSlug);
  const [tripDialog, setTripDialog] = useState<{ mode: 'create'; date: string } | { mode: 'edit'; trip: PlannedTrip } | null>(null);
  const [linkEventOpen, setLinkEventOpen] = useState(false);
  const canPlanTrips = tripPlan.data?.can_manage ?? false;

  const saveTrip = (values: TripFormValues) => {
    if (tripDialog?.mode === 'edit') {
      updateTrip.mutate({ listId: tripDialog.trip.list_id, ...values }, { onSuccess: () => setTripDialog(null) });
    } else {
      createTrip.mutate(values, { onSuccess: () => setTripDialog(null) });
    }
  };

  return (
    <div className="space-y-6">
      {tripPlanning && !eventSlug && canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card px-4 py-3 shadow-card" data-testid="day-trips-no-event">
          <p className="text-body text-muted-foreground">Event verknüpfen, um Einkäufe zu planen</p>
          <button
            type="button"
            onClick={() => setLinkEventOpen(true)}
            className="press rounded-lg bg-primary-soft px-3 py-1.5 text-body font-semibold text-primary hover:bg-primary-soft-border/70"
          >
            Event verknüpfen
          </button>
          <LinkEventDialog
            open={linkEventOpen}
            onOpenChange={setLinkEventOpen}
            plan={{ id: mealPlanId, ...tripPlanning.plan }}
            onLinked={(slug) => navigate(`/shopping-lists/events/${slug}`)}
          />
        </div>
      )}

      {/* RefMeal Links */}
      <RefMealChips mealPlanId={mealPlanId} refMeals={refMeals} canEdit={canEdit} />

      {/* Add Day Before */}
      {canEdit && hasTimeframe && (
        <div className="flex justify-center">
          <button
            onClick={onAddDayBefore}
            disabled={addDayBeforePending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary/20 text-body text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Tag davor
          </button>
        </div>
      )}

      {/* Days */}
      {dayGroups.length === 0 ? (
        <EmptyState
          icon="event"
          title="Noch keine Tage vorhanden"
          description="Füge einen Tag hinzu, um mit der Planung zu beginnen."
        />
      ) : (
        dayGroups.map((group) => {
          const dayActualKcal = Math.round(group.meals.reduce((sum, m) => sum + m.total_energy_kcal / effectivePortions(m, normPortions), 0));
          const dayTargetKcal = Math.round(group.meals.reduce((sum, m) => sum + NORM_PERSON_DAILY_KCAL * m.day_part_factor, 0));
          const dayActualCost = group.meals.reduce((sum, m) => sum + m.total_cost_eur / effectivePortions(m, normPortions), 0);
          const dayTargetCost = budgetPerPersonPerDay ? group.meals.reduce((sum, m) => sum + budgetPerPersonPerDay * m.day_part_factor, 0) : 0;

          return (
            <div key={group.date} id={`day-${group.date}`} className="rounded-xl bg-card overflow-hidden scroll-mt-24 shadow-card">
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 bg-primary/5 border-b gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-section sm:text-section">{formatDate(group.date)}</h3>
                    {(() => {
                      const coverage = getDayCoverage(group.meals);
                      const badge = getCoverageBadge(coverage);
                      const colorClasses = {
                        green: 'bg-primary/10 text-primary border-primary/20',
                        yellow: 'bg-warning-soft text-warning border-warning-border',
                        red: 'bg-destructive/10 text-destructive border-destructive/20',
                        overplanned: 'bg-destructive/10 text-destructive border-destructive/20',
                      };
                      return (
                        <span className={`inline-block px-2.5 py-1 text-caption font-bold rounded-full border ${colorClasses[badge.status]}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-full border border-border/50 font-medium">
                      <Icon name="local_fire_department" size={16} />
                      <span>Energie: Ist {formatCount(dayActualKcal)} / Soll {formatCount(dayTargetKcal)} kcal</span>
                    </span>
                    {budgetPerPersonPerDay != null && budgetPerPersonPerDay > 0 && (
                      <span className="inline-flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-full border border-border/50 font-medium">
                        <Icon name="payments" size={16} />
                        <span>Preis: Ist {formatNumber(dayActualCost, { maxDecimals: 2 })} € / Soll {formatNumber(dayTargetCost, { maxDecimals: 2 })} €</span>
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (() => {
                  const isEdgeDay = dayGroups.length > 1 && (group.date === dayGroups[0].date || group.date === dayGroups[dayGroups.length - 1].date);
                  const deleteReason = dayGroups.length <= 1
                    ? 'Der letzte Tag eines Plans kann nicht gelöscht werden.'
                    : !isEdgeDay
                    ? 'Nur der erste oder letzte Tag eines Plans kann gelöscht werden (zusammenhängender Zeitraum).'
                    : 'Tag löschen';
                  return (
                    <button
                      onClick={() => isEdgeDay && onDeleteDay(group.date)}
                      disabled={!isEdgeDay}
                      className={`p-1.5 rounded-full transition-colors self-end sm:self-auto ${
                        isEdgeDay
                          ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer'
                          : 'text-muted-foreground cursor-not-allowed'
                      }`}
                      title={deleteReason}
                      aria-label={deleteReason}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  );
                })()}
              </div>

              {/* Meals */}
              <div className="divide-y">
                {mergeDayEntries(group.meals, tripsOfDay(tripPlan.data?.trips ?? [], group.date)).map((entry) =>
                  entry.type === 'trip' ? (
                    <DayTripMarker
                      key={`trip-${entry.trip.list_id}`}
                      trip={entry.trip}
                      eventSlug={eventSlug}
                      canChangeTime={canPlanTrips}
                      onChangeTime={(trip) => setTripDialog({ mode: 'edit', trip })}
                    />
                  ) : (
                  <div
                    key={entry.meal.id}
                    id={`meal-${entry.meal.id}`}
                    data-date-meal-type={`meal-${group.date}-${entry.meal.meal_type}`}
                    className="scroll-mt-24 transition-all"
                    draggable={canEdit && !entry.meal.is_synced}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({ mealId: entry.meal.id }));
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      if (!canEdit) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      e.currentTarget.classList.add('bg-primary/5');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('bg-primary/5');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('bg-primary/5');
                      try {
                        const raw = e.dataTransfer.getData('application/json');
                        if (!raw) return;
                        const data = JSON.parse(raw);
                        if (data.mealId && data.mealId !== entry.meal.id) {
                          reorderMutation.mutate(
                            { source_meal_id: data.mealId, target_meal_id: entry.meal.id, mode: 'swap' },
                            {
                              onSuccess: () => notify.success('Mahlzeiten erfolgreich getauscht'),
                              onError: (err) => notify.error('Mahlzeiten konnten nicht getauscht werden', { error: err }),
                            }
                          );
                        }
                      } catch {
                        // ignore invalid drop
                      }
                    }}
                  >
                    <span id={`meal-${group.date}-${entry.meal.meal_type}`} className="sr-only pointer-events-none" />
                    <MealSlot
                      meal={entry.meal}
                      canEdit={canEdit}
                      normPortions={normPortions}
                      budgetPerPersonPerDay={budgetPerPersonPerDay}
                      siblingMeals={group.meals}
                      onDeleteMeal={onDeleteMeal}
                      onAddRecipe={onAddRecipe}
                      onAddIngredient={onAddIngredient}
                      onActivate={onActivateMeal}
                      onDeleteItem={onDeleteItem}
                      onUpdateItemFactor={onUpdateItemFactor}
                      onUpdateItem={onUpdateItem}
                      onUpdateMeal={onUpdateMeal}
                      onScaleMeal={onScaleMeal}
                      onCopyFromPlan={onCopyFromPlan}
                      nutritionalTagIds={nutritionalTagIds}
                      nutritionalTagNames={nutritionalTagNames}
                    />
                  </div>
                  ),
                )}
              </div>


              {canPlanTrips && (
                <div className="border-t bg-muted/20 px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setTripDialog({ mode: 'create', date: group.date })}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-body font-medium text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4" />
                    Einkauf einfügen
                  </button>
                </div>
              )}

              {/* Add Meal */}
              {canEdit && (
                <div className="px-5 py-3 border-t bg-muted/20">
                  <div className="flex flex-wrap gap-1.5">
                    {MEAL_TYPE_ORDER
                      .filter((mt) => mt !== 'snack' && !group.meals.some((m) => m.meal_type === mt))
                      .map((mt) => (
                        <button
                          key={mt}
                          onClick={async () => {
                            const newMeal = await onAddMealType(group.date, mt);
                            if (newMeal) setSearchDialogMeal(newMeal);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-primary" />
                          {MEAL_TYPE_LABELS[mt] || mt}
                        </button>
                      ))}
                    {/* Snack can be added multiple times per day */}
                    <button
                      onClick={async () => {
                        const newMeal = await onAddMealType(group.date, 'snack');
                        if (newMeal) setSearchDialogMeal(newMeal);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-primary" />
                      {MEAL_TYPE_LABELS.snack}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Add Day After */}
      {canEdit && hasTimeframe && (
        <div className="flex justify-center">
          <button
            onClick={onAddDayAfter}
            disabled={addDayAfterPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary/20 text-body text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Tag danach
          </button>
        </div>
      )}

      {tripPlanning && eventSlug && (
        <TripFormDialog
          open={tripDialog !== null}
          onOpenChange={(open) => !open && setTripDialog(null)}
          eventSlug={eventSlug}
          defaultDate={tripDialog?.mode === 'create' ? tripDialog.date : undefined}
          initial={
            tripDialog?.mode === 'edit'
              ? {
                  store: tripDialog.trip.store_id !== null ? { id: tripDialog.trip.store_id, name: tripDialog.trip.store_name } : null,
                  scheduledAt: tripDialog.trip.scheduled_at,
                  name: tripDialog.trip.name,
                }
              : undefined
          }
          pending={createTrip.isPending || updateTrip.isPending}
          error={tripDialog?.mode === 'edit' ? updateTrip.error : createTrip.error}
          onSubmit={saveTrip}
        />
      )}

      {/* Recipe Search Dialog — immer gemountet, Sichtbarkeit per open-Prop */}
      <RecipeSearchDialog
        mealType={searchDialogMeal?.meal_type ?? 'snack'}
        open={searchDialogMeal !== null}
        onOpenChange={(open) => { if (!open) setSearchDialogMeal(null); }}
        onSelect={(recipeId) => {
          if (!searchDialogMeal) return;
          onAddRecipe(searchDialogMeal.id, recipeId);
          setSearchDialogMeal(null);
        }}
        onSelectIngredient={(ingredientId, portionId, measuringUnitId, quantity, _ingredientName) => {
          if (!searchDialogMeal) return;
          onAddIngredient(searchDialogMeal.id, ingredientId, portionId, measuringUnitId, quantity);
          setSearchDialogMeal(null);
        }}
        nutritionalTagIds={nutritionalTagIds}
        nutritionalTagNames={nutritionalTagNames}
      />
    </div>
  );
}
