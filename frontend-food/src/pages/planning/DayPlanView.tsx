import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Link2 } from 'lucide-react';
import { MealSlot } from './MealSlot';
import { MEAL_TYPE_LABELS, NORM_PERSON_DAILY_KCAL } from '@/schemas/mealPlan';
import type { Meal } from '@/schemas/mealPlan';
import { kjToKcal } from '@/utils/nutritionUnits';
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
  onUnlinkMeal,
  onLinkMeal,
  onUpdateMeal,
  onScaleMeal,
  onCopyItem,
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
  onUnlinkMeal: (mealId: number) => void;
  onLinkMeal: (mealId: number, mealType: string) => void;
  onUpdateMeal: (mealId: number, data: {
    note?: string | null;
    override_portions?: number | null;
    day_part_factor?: number | null;
    is_external?: boolean | null;
    external_energy_kcal?: number | null;
    external_cost_per_person?: number | null;
  }) => void;
  onScaleMeal: (mealId: number) => void;
  onCopyItem: (itemId: number) => void;
}) {
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'drinks'];
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
          const dayActualKcal = Math.round(group.meals.filter((m) => m.meal_type !== 'drinks').reduce((sum, m) => sum + kjToKcal(m.total_energy_kj / normPortions), 0));
          const dayTargetKcal = Math.round(group.meals.filter((m) => m.meal_type !== 'drinks').reduce((sum, m) => sum + NORM_PERSON_DAILY_KCAL * m.day_part_factor, 0));
          const dayActualCost = group.meals.reduce((sum, m) => sum + m.total_cost_eur / normPortions, 0);
          const dayTargetCost = budgetPerPersonPerDay ? group.meals.reduce((sum, m) => sum + budgetPerPersonPerDay * m.day_part_factor, 0) : 0;

          return (
            <div key={group.date} className="rounded-xl border bg-card overflow-hidden">
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 bg-muted/50 border-b gap-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 min-w-0">
                  <h3 className="font-bold text-base sm:text-lg">{formatDate(group.date)}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 bg-background px-2 py-0.5 rounded border border-border/50 font-medium">
                      <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                      <span>Kcal: Soll {dayTargetKcal} / {dayActualKcal} kcal</span>
                    </span>
                    {budgetPerPersonPerDay != null && budgetPerPersonPerDay > 0 && (
                      <span className="inline-flex items-center gap-1 bg-background px-2 py-0.5 rounded border border-border/50 font-medium">
                        <span className="material-symbols-outlined text-[14px]">payments</span>
                        <span>Preis: Soll {dayTargetCost.toFixed(2)} € / Ist {dayActualCost.toFixed(2)} €</span>
                      </span>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => onDeleteDay(group.date)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors self-end sm:self-auto"
                    title="Tag löschen"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                )}
              </div>

              {/* Meals */}
              <div className="divide-y">
                {group.meals.map((meal) => (
                  <MealSlot
                    key={meal.id}
                    meal={meal}
                    canEdit={canEdit}
                    normPortions={normPortions}
                    budgetPerPersonPerDay={budgetPerPersonPerDay}
                    onDeleteMeal={onDeleteMeal}
                    onAddRecipe={onAddRecipe}
                    onAddIngredient={onAddIngredient}
                    onDeleteItem={onDeleteItem}
                    onUpdateItemFactor={onUpdateItemFactor}
                    onUnlinkMeal={onUnlinkMeal}
                    onLinkMeal={onLinkMeal}
                    onUpdateMeal={onUpdateMeal}
                    onScaleMeal={onScaleMeal}
                    onCopyItem={onCopyItem}
                  />
                ))}
              </div>

              {/* Add Meal */}
              {canEdit && (
                <div className="px-4 py-2 border-t bg-muted/30">
                  <div className="flex flex-wrap gap-1">
                    {mealTypes
                      .filter((mt) => !group.meals.some((m) => m.meal_type === mt))
                      .map((mt) => (
                        <button
                          key={mt}
                          onClick={async () => {
                            const newMeal = await onAddMealType(group.date, mt);
                            if (newMeal) setSearchDialogMeal(newMeal);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-sm text-primary hover:bg-primary/5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5 text-primary" />
                          {MEAL_TYPE_LABELS[mt] || mt}
                        </button>
                      ))}
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

      {/* Recipe Search Dialog (after creating a new meal) */}
      {searchDialogMeal && (
        <RecipeSearchDialog
          mealType={searchDialogMeal.meal_type}
          open={!!searchDialogMeal}
          onOpenChange={(open) => { if (!open) setSearchDialogMeal(null); }}
          onSelect={(recipeId) => {
            onAddRecipe(searchDialogMeal.id, recipeId);
            setSearchDialogMeal(null);
          }}
          onSelectIngredient={(ingredientId, portionId, measuringUnitId, quantity) => {
            onAddIngredient(searchDialogMeal.id, ingredientId, portionId, measuringUnitId, quantity);
            setSearchDialogMeal(null);
          }}
        />
      )}
    </div>
  );
}
