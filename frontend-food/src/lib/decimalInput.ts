/** Parses a user-entered decimal, accepting the German decimal comma. */
export function parseDecimalInput(rawValue: string): number | null {
  const normalized = rawValue.trim().replace(',', '.');
  if (!/^(?:\d+|\d+\.\d+|\.\d+)$/.test(normalized)) return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Formats a number for an editable German decimal field. */
export function formatDecimalInput(value: number): string {
  return String(value).replace('.', ',');
}
