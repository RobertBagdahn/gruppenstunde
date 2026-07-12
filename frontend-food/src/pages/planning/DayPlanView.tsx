import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Link2 } from 'lucide-react';
import { MealSlot } from './MealSlot';
import { MEAL_TYPE_ORDER, MEAL_TYPE_LABELS, NORM_PERSON_DAILY_KCAL, getDayCoverage, getCoverageBadge, effectivePortions } from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';
import EmptyState from '@/components/shared/EmptyState';
import RecipeSearchDialog from './RecipeSearchDialog';

export function DayPlanView({
  mealPlanId,
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
  onDeleteItem,
  onUpdateItemFactor,
  onUpdateItemQuantity,
  onUpdateMeal,
  onScaleMeal,
  onCopyFromPlan,
  nutritionalTagIds,
  nutritionalTagNames,
}: {
  mealPlanId: number;
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
  onAddIngredient: (mealId: number, ingredientId: number, portionId: number | null, measuringUnitId: number | null, quantity: number) => void;
  onDeleteItem: (id: number) => void;
  onUpdateItemFactor: (itemId: number, factor: number) => void;
  onUpdateItemQuantity?: (itemId: number, quantity: number) => void;
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
}) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const [searchDialogMeal, setSearchDialogMeal] = useState<Meal | null>(null);

  return (
    <div className="space-y-6">
      {/* RefMeal Links */}
      {canEdit && (
        <div className="flex flex-wrap gap-2 px-1">
          {['breakfast', 'snack'].map((mt) => (
            <Link
              key={mt}
              to={`/meal-plans/${mealPlanId}/ref-meals/${mt}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm hover:bg-accent transition-colors"
            >
              <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
              Referenz: {MEAL_TYPE_LABELS[mt] || mt}
            </Link>
          ))}
        </div>
      )}

      {/* Add Day Before */}
      {canEdit && hasTimeframe && (
        <div className="flex justify-center">
          <button
            onClick={onAddDayBefore}
            disabled={addDayBeforePending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary/20 text-sm text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
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
            <div key={group.date} id={`day-${group.date}`} className="rounded-2xl border bg-card overflow-hidden shadow-sm scroll-mt-24">
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 bg-primary/5 border-b gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-lg sm:text-xl">{formatDate(group.date)}</h3>
                    {(() => {
                      const coverage = getDayCoverage(group.meals);
                      const badge = getCoverageBadge(coverage);
                      const colorClasses = {
                        green: 'bg-primary/10 text-primary border-primary/20',
                        yellow: 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/20',
                        red: 'bg-destructive/10 text-destructive border-destructive/20',
                        overplanned: 'bg-destructive/10 text-destructive border-destructive/20',
                      };
                      return (
                        <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-full border ${colorClasses[badge.status]}`}>
                          {badge.label}
                        </span>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-full border border-border/50 font-medium">
                      <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                      <span>Kcal: Soll {dayTargetKcal} / {dayActualKcal} kcal</span>
                    </span>
                    {budgetPerPersonPerDay != null && budgetPerPersonPerDay > 0 && (
                      <span className="inline-flex items-center gap-1.5 bg-background px-2.5 py-1 rounded-full border border-border/50 font-medium">
                        <span className="material-symbols-outlined text-[16px]">payments</span>
                        <span>Preis: Soll {dayTargetCost.toFixed(2)} € / Ist {dayActualCost.toFixed(2)} €</span>
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => onDeleteDay(group.date)}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors self-end sm:self-auto"
                    title="Tag löschen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Meals */}
              <div className="divide-y">
                {group.meals.map((meal) => (
                  <div key={meal.id} id={`meal-${group.date}-${meal.meal_type}`} className="scroll-mt-24">
                    <MealSlot
                      meal={meal}
                      canEdit={canEdit}
                      normPortions={normPortions}
                      budgetPerPersonPerDay={budgetPerPersonPerDay}
                      siblingMeals={group.meals}
                      onDeleteMeal={onDeleteMeal}
                      onAddRecipe={onAddRecipe}
                      onAddIngredient={onAddIngredient}
                      onDeleteItem={onDeleteItem}
                      onUpdateItemFactor={onUpdateItemFactor}
                      onUpdateItemQuantity={onUpdateItemQuantity}
                      onUpdateMeal={onUpdateMeal}
                      onScaleMeal={onScaleMeal}
                      onCopyFromPlan={onCopyFromPlan}
                      nutritionalTagIds={nutritionalTagIds}
                      nutritionalTagNames={nutritionalTagNames}
                    />
                  </div>
                ))}
              </div>

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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-primary/20 text-sm text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Tag danach
          </button>
        </div>
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
