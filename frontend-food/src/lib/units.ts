import type { MeasuringUnit } from '@/api/supplies';

const BASE_UNIT_NAMES = new Set(['Gramm', 'Milliliter']);

const UNIT_ABBREV: Record<string, string> = {
  g: 'g',
  ml: 'ml',
  stk: 'Stk.',
};

function formatQuantity(qty: number): string {
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toFixed(1).replace('.', ',');
}

export function formatMeasuringUnitLabel(unit: MeasuringUnit): string {
  if (BASE_UNIT_NAMES.has(unit.name)) {
    return unit.name;
  }
  const qtyStr = formatQuantity(unit.quantity);
  const abbrev = UNIT_ABBREV[unit.unit] ?? unit.unit;
  return `${unit.name} (${qtyStr} ${abbrev})`;
}
