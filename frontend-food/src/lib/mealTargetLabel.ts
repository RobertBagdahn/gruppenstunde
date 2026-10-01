import { MEAL_TYPE_LABELS } from '@/schemas/mealPlan';

/** "Abendessen · Fr., 11.12." — names the meal a search selection is added to. */
export function mealTargetLabel(meal: { meal_type: string; start_datetime: string | null }): string {
  const name = MEAL_TYPE_LABELS[meal.meal_type] ?? meal.meal_type;
  if (!meal.start_datetime) return name;
  const date = new Date(meal.start_datetime).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
  return `${name} · ${date}`;
}
