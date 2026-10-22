import { format } from 'date-fns';
import type { Meal } from '@/schemas/mealPlan';
import type { PlannedTrip } from '@/schemas/shoppingTrip';

export type DayEntry = { type: 'meal'; meal: Meal } | { type: 'trip'; trip: PlannedTrip };

/** Trips that take place on a calendar day (local time), earliest first. */
export function tripsOfDay(trips: PlannedTrip[], date: string): PlannedTrip[] {
  return trips
    .filter((trip) => trip.scheduled_at !== null && format(new Date(trip.scheduled_at), 'yyyy-MM-dd') === date)
    .sort((a, b) => new Date(a.scheduled_at as string).getTime() - new Date(b.scheduled_at as string).getTime() || a.list_id - b.list_id);
}

/**
 * Meals of a day with the day's trips sorted in by time: a trip stands before the first meal that starts after it.
 * Meals without a start time keep their place; trips later than every timed meal come last.
 */
export function mergeDayEntries(meals: Meal[], trips: PlannedTrip[]): DayEntry[] {
  const pending = [...trips];
  const entries: DayEntry[] = [];
  for (const meal of meals) {
    if (meal.start_datetime) {
      const start = new Date(meal.start_datetime).getTime();
      while (pending.length > 0 && new Date(pending[0].scheduled_at as string).getTime() <= start) {
        entries.push({ type: 'trip', trip: pending.shift() as PlannedTrip });
      }
    }
    entries.push({ type: 'meal', meal });
  }
  for (const trip of pending) entries.push({ type: 'trip', trip });
  return entries;
}
