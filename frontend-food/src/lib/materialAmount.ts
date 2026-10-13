/** Helpers for material amounts (recipe materials, material lists). */
import type { RecipeMaterial } from '@/schemas/recipe';
import type { MaterialListEntry, MaterialListResult } from '@/schemas/supply';

export const QUANTITY_MODE_LABELS = {
  per_portion: 'pro Portion',
  total: 'gesamt',
} as const;

/** Amount of a recipe material for `servings`, rounded up to whole pieces (mirrors the backend). */
export function scaledMaterialAmount(
  item: Pick<RecipeMaterial, 'amount' | 'quantity_mode'>,
  servings: number,
): number {
  const raw = item.quantity_mode === 'per_portion' ? item.amount * servings : item.amount;
  return Math.ceil(Math.round(raw * 1e6) / 1e6);
}

/** "8×" style label; devices with a single unit show no multiplier. */
export function formatMaterialAmount(amount: number, isConsumable: boolean): string {
  const text = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(amount);
  return isConsumable || amount !== 1 ? `${text}×` : '';
}

/** Parse a user-typed number with German decimal comma; null when empty or not positive. */
export function parseAmountInput(value: string): number | null {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
}


function entryLine(entry: MaterialListEntry): string {
  const amount = formatMaterialAmount(entry.amount, entry.is_consumable);
  return amount ? `${entry.name}: ${amount}` : entry.name;
}

/** Plain-text version of a material list for sharing (e.g. in a chat). */
export function buildMaterialListText(list: MaterialListResult): string {
  const blocks: string[] = [`Materialliste: ${list.title}`];
  if (list.devices.length > 0) {
    blocks.push(['Geräte', ...list.devices.map((entry) => `- ${entryLine(entry)}`)].join('\n'));
  }
  if (list.consumables.length > 0) {
    blocks.push(['Verbrauchsmaterial', ...list.consumables.map((entry) => `- ${entryLine(entry)}`)].join('\n'));
  }
  return blocks.join('\n\n');
}
