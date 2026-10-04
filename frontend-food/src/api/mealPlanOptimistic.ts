/**
 * Pure helpers for optimistic meal plan updates. They keep the meal totals (which feed the plan
 * header: budget per person, kcal) in step with item changes, so the header never shows the old
 * amount next to an already changed item list while the server answer is on its way.
 */
import type { MealPlanDetail } from '@/schemas/mealPlan';

type PlanMeal = MealPlanDetail['meals'][number];
type PlanItem = PlanMeal['items'][number];

function withTotals(meal: PlanMeal, items: PlanItem[], costDelta: number, energyDelta: number): PlanMeal {
  return {
    ...meal,
    items,
    total_cost_eur: Math.max(0, meal.total_cost_eur + costDelta),
    total_energy_kcal: Math.max(0, meal.total_energy_kcal + energyDelta),
  };
}

/** The plan without the item; the meal totals lose the item's cost and energy. */
export function removeItemFromPlan(plan: MealPlanDetail, itemId: number): MealPlanDetail {
  return {
    ...plan,
    meals: plan.meals.map((meal) => {
      const removed = meal.items.find((item) => item.id === itemId);
      if (!removed) return meal;
      return withTotals(
        meal,
        meal.items.filter((item) => item.id !== itemId),
        -(removed.cost_eur ?? 0),
        -(removed.energy_kcal ?? 0),
      );
    }),
  };
}

/**
 * The plan with a changed factor or quantity: the item's cost and energy scale with the ratio
 * to the old value, and the meal totals follow by the difference. Items without a usable old
 * value (0 or missing) are left to the server answer.
 */
export function scaleItemInPlan(
  plan: MealPlanDetail,
  itemId: number,
  change: { factor?: number; quantity?: number },
): MealPlanDetail {
  return {
    ...plan,
    meals: plan.meals.map((meal) => {
      const current = meal.items.find((item) => item.id === itemId);
      if (!current) return meal;

      let ratio = 1;
      const next: Partial<PlanItem> = {};
      if (change.factor !== undefined) {
        if (!(current.factor > 0)) return meal;
        ratio *= change.factor / current.factor;
        next.factor = change.factor;
      }
      if (change.quantity !== undefined) {
        if (!current.quantity || current.quantity <= 0) return meal;
        ratio *= change.quantity / current.quantity;
        next.quantity = change.quantity;
      }

      const cost = current.cost_eur == null ? current.cost_eur : current.cost_eur * ratio;
      const energy = current.energy_kcal == null ? current.energy_kcal : current.energy_kcal * ratio;
      const updated: PlanItem = { ...current, ...next, cost_eur: cost, energy_kcal: energy };
      return withTotals(
        meal,
        meal.items.map((item) => (item.id === itemId ? updated : item)),
        (cost ?? 0) - (current.cost_eur ?? 0),
        (energy ?? 0) - (current.energy_kcal ?? 0),
      );
    }),
  };
}
