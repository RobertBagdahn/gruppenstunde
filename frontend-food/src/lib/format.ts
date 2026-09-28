/**
 * Single source of truth for German-locale (`de-DE`) number, weight, and
 * count formatting in the food frontend. The backend sends raw numbers;
 * this module is the only place that turns them into display strings.
 *
 * `formatWeight`/`formatExactWeight` mirror `backend/supply/utils.py`
 * (`format_weight`/`format_exact_weight`) exactly — both are exercised
 * against the shared fixture `backend/supply/tests/fixtures/format_weight_cases.json`
 * (see `format.test.ts`) so the two implementations can never drift apart.
 *
 * `.tsx` files MUST NOT call `toFixed()` or define their own formatNumber/
 * formatPrice — an ESLint rule enforces this (see eslint.config.js).
 */

const numberFormatters = new Map<number, Intl.NumberFormat>();

function numberFormatter(maxDecimals: number): Intl.NumberFormat {
  let formatter = numberFormatters.get(maxDecimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    });
    numberFormatters.set(maxDecimals, formatter);
  }
  return formatter;
}

const euroFormatter = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a number for German-locale display: comma as decimal separator,
 * period as thousands separator, whole numbers without decimals.
 * `null`/`undefined` render as "–" (no value available).
 */
export function formatNumber(
  value: number | null | undefined,
  options?: { maxDecimals?: number },
): string {
  if (value == null) return '–';
  return numberFormatter(options?.maxDecimals ?? 1).format(value);
}

/** Format a count (e.g. a list total) as a whole German-locale number: "5918" → "5.918". */
export function formatCount(count: number): string {
  return numberFormatter(0).format(Math.round(count));
}

/** Format a Euro amount: 0.47 → "0,47 €". */
export function formatEuro(value: number): string {
  // Intl inserts a narrow no-break space before "€"; normalize to a plain
  // space so the string behaves predictably (line-wrapping, snapshot tests).
  return euroFormatter.format(value).replace(/[\u00a0\u202f]/g, ' ');
}

function roundHalfUp(value: number, step = 1): number {
  return Math.round(value / step) * step;
}

/**
 * Format a *computed* weight (in grams) for German-locale display. Rounds —
 * never use this for a portion's own defined weight (see `formatExactWeight`).
 * Mirrors `backend/supply/utils.py::format_weight` exactly.
 */
export function formatWeight(grams: number): string {
  if (grams <= 0) return '0 g';
  if (grams < 1) {
    return `${roundHalfUp(grams * 1000)} mg`;
  }
  if (grams >= 1000) {
    const kg = grams / 1000;
    return `${kg.toFixed(1).replace('.', ',')} kg`;
  }
  if (grams >= 100) {
    return `${roundHalfUp(grams, 10)} g`;
  }
  if (grams >= 50) {
    return `${roundHalfUp(grams, 5)} g`;
  }
  return `${roundHalfUp(grams)} g`;
}

/**
 * Format a portion's or package's *defined* weight (e.g. "à 125 g") without
 * rounding — only the display representation is rounded to at most one
 * decimal. Use this wherever a weight is a fact about the portion, not a
 * computed total. Mirrors `backend/supply/utils.py::format_exact_weight`.
 */
export function formatExactWeight(grams: number): string {
  if (grams <= 0) return '0 g';
  if (grams < 1) {
    return `${Math.round(grams * 1000)} mg`;
  }
  if (grams >= 1000) {
    const kg = grams / 1000;
    return kg === Math.trunc(kg) ? `${kg} kg` : `${kg.toFixed(1).replace('.', ',')} kg`;
  }
  return grams === Math.trunc(grams) ? `${grams} g` : `${grams.toFixed(1).replace('.', ',')} g`;
}

const literFormatter = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Format a volume in millilitres: below 1.000 ml as whole millilitres
 * ("250 ml"), from 1.000 ml as litres with exactly one decimal ("9,1 l").
 */
export function formatVolume(ml: number): string {
  if (ml <= 0) return '0 ml';
  if (ml < 1000) return `${formatCount(ml)} ml`;
  return `${literFormatter.format(roundHalfUp(ml / 1000, 0.1))} l`;
}

/**
 * Build a "{count} {word}" string with the correct German plural.
 * `formatCount` handles the number; callers supply both word forms
 * explicitly — there is no automatic pluralization heuristic.
 */
export function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatCount(count)} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Round a number to `decimals` places and return it as a *number* (not a
 * display string) — for values that feed further calculation or comparison
 * rather than being shown directly. Replaces the `parseFloat(x.toFixed(n))`
 * idiom, which relies on locale-independent string round-tripping.
 */
export function roundToDecimals(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
