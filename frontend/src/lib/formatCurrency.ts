const EURO_FORMATTER = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

/** Format an amount (number or decimal string from the API) as German euro currency, e.g. "1.234,50 €". */
export function formatEuro(value: number | string): string {
  const amount = typeof value === 'string' ? parseFloat(value) : value;
  return EURO_FORMATTER.format(Number.isFinite(amount) ? amount : 0);
}
