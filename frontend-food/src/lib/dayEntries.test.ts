import { describe, expect, it } from 'vitest';
import type { Meal } from '@/schemas/mealPlan';
import { PlannedTripSchema } from '@/schemas/shoppingTrip';
import { mergeDayEntries, tripsOfDay } from './dayEntries';

const meal = (id: number, hour: number | null) =>
  ({ id, start_datetime: hour === null ? null : new Date(2026, 9, 24, hour, 0).toISOString() }) as unknown as Meal;
const trip = (id: number, day: number, hour: number) =>
  PlannedTripSchema.parse({ list_id: id, name: `T${id}`, status: 'planned', scheduled_at: new Date(2026, 9, day, hour, 0).toISOString() });

const label = (entries: ReturnType<typeof mergeDayEntries>) =>
  entries.map((entry) => (entry.type === 'meal' ? `M${entry.meal.id}` : `T${entry.trip.list_id}`));

describe('day entries', () => {
  it('sorts a trip between breakfast and lunch', () => {
    const entries = mergeDayEntries([meal(1, 8), meal(2, 12.5 | 0)], [trip(5, 24, 10)]);
    expect(label(entries)).toEqual(['M1', 'T5', 'M2']);
  });

  it('puts a trip at the same time before the meal and late trips last', () => {
    const entries = mergeDayEntries([meal(1, 8), meal(2, 12)], [trip(5, 24, 12), trip(6, 24, 20)]);
    expect(label(entries)).toEqual(['M1', 'T5', 'M2', 'T6']);
  });

  it('keeps meals without a time in place', () => {
    const entries = mergeDayEntries([meal(1, null), meal(2, 12)], [trip(5, 24, 9)]);
    expect(label(entries)).toEqual(['M1', 'T5', 'M2']);
  });

  it('selects the trips of one local day in time order', () => {
    const trips = [trip(3, 25, 9), trip(2, 24, 18), trip(1, 24, 8)];
    expect(tripsOfDay(trips, '2026-10-24').map((t) => t.list_id)).toEqual([1, 2]);
    expect(tripsOfDay(trips, '2026-10-26')).toEqual([]);
  });
});
