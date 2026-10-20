import { formatCount, formatExactWeight, formatVolume, formatWeight } from '@/lib/format';
import type { TripRow, Uncovered } from '@/schemas/shoppingTrip';

/** Amount of a trip row in the unit the shopping tab shows it in. */
export function formatRowQuantity(row: Pick<TripRow, 'unit' | 'quantity' | 'total_quantity_g'>): string {
  if (row.unit === 'ml') return formatVolume(row.quantity);
  if (row.unit === 'g') return formatWeight(row.total_quantity_g);
  return `${formatCount(row.quantity)} ${row.unit}`;
}

/** Plain amount for rules and diffs, where the stored unit (g or Stück) is what the user types. */
export function formatBaseAmount(amount: number, unit: string): string {
  // Stored amounts are exact, so "1 kg" instead of the rounded estimate "1,0 kg"
  return unit === 'g' ? formatExactWeight(amount) : `${formatCount(amount)} ${unit}`;
}

export const UNCOVERED_REASON_LABELS: Record<Uncovered['reason'], string> = {
  before_first_trip: 'Vor dem ersten Einkauf',
  no_time: 'Mahlzeit ohne Uhrzeit',
  no_trips: 'Noch kein Einkauf geplant',
};
