export function formatBoardQuantity(quantity: number, unit: string): string {
  if (!quantity) return '';
  if (unit === 'g' && quantity >= 1000) {
    return `${(quantity / 1000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} kg`;
  }
  return `${quantity.toLocaleString('de-DE', { maximumFractionDigits: 1 })} ${unit}`.trim();
}
