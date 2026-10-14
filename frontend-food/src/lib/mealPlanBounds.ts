/**
 * Allowed value ranges of meal plan inputs. Mirrors `backend/planner/services/input_bounds.py`;
 * a backend test (`test_input_bounds_parity`) keeps both files equal
 * (openspec change `meal-plan-input-guardrails`).
 */
export const RESERVE_FACTOR_MIN = 1.0;
export const RESERVE_FACTOR_MAX = 2.0;
export const ACTIVITY_FACTOR_MIN = 1.0;
export const ACTIVITY_FACTOR_MAX = 2.5;
export const DAY_PART_FACTOR_MIN = 0.0;
export const DAY_PART_FACTOR_MAX = 1.0;
export const DAY_PART_FACTORS_SUM_MAX = 1.5;
export const NORM_PORTIONS_MIN_EXCLUSIVE = 0.0;
export const NORM_PORTIONS_MAX = 1000.0;
export const OVERRIDE_PORTIONS_MIN = 1;
export const OVERRIDE_PORTIONS_MAX = 1000;
export const MEAL_ITEM_FACTOR_MAX = 100.0;
export const QUANTITY_GRAMS_MAX = 100_000.0;
export const QUANTITY_COUNT_MAX = 100_000.0;
export const PORTION_WEIGHT_G_MAX = 100_000.0;
export const PLAN_MAX_DAYS = 60;
export const PLAN_MAX_MEALS = 500;

function germanNumber(value: number): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: Number.isInteger(value) && value < 1000 ? 1 : 0, maximumFractionDigits: 2 });
}

export function rangeHint(min: number, max: number): string {
  return `Erlaubt: ${germanNumber(min)} bis ${germanNumber(max)}`;
}

export const RESERVE_FACTOR_HINT = rangeHint(RESERVE_FACTOR_MIN, RESERVE_FACTOR_MAX);
export const ACTIVITY_FACTOR_HINT = rangeHint(ACTIVITY_FACTOR_MIN, ACTIVITY_FACTOR_MAX);
export const DAY_PART_FACTOR_HINT = rangeHint(DAY_PART_FACTOR_MIN, DAY_PART_FACTOR_MAX);
export const NORM_PORTIONS_HINT = `Erlaubt: größer 0 bis ${germanNumber(NORM_PORTIONS_MAX)}`;
export const OVERRIDE_PORTIONS_HINT = `Erlaubt: ${OVERRIDE_PORTIONS_MIN} bis ${OVERRIDE_PORTIONS_MAX}`;

/** German message for a value outside `[min, max]`, or null when it is valid. */
export function rangeError(value: number | null, min: number, max: number, label: string): string | null {
  if (value === null || !Number.isFinite(value) || value < min || value > max) {
    return `${label} muss zwischen ${germanNumber(min)} und ${germanNumber(max)} liegen.`;
  }
  return null;
}

export function reserveFactorError(value: number | null): string | null {
  return rangeError(value, RESERVE_FACTOR_MIN, RESERVE_FACTOR_MAX, 'Der Reservefaktor');
}

export function activityFactorError(value: number | null): string | null {
  return rangeError(value, ACTIVITY_FACTOR_MIN, ACTIVITY_FACTOR_MAX, 'Der Aktivitätsfaktor');
}

export function dayPartFactorError(value: number | null): string | null {
  return rangeError(value, DAY_PART_FACTOR_MIN, DAY_PART_FACTOR_MAX, 'Der Tagesanteil');
}

export function normPortionsError(value: number | null): string | null {
  if (value === null || !Number.isFinite(value) || value <= NORM_PORTIONS_MIN_EXCLUSIVE || value > NORM_PORTIONS_MAX) {
    return `Die Normportionen müssen größer 0 und höchstens ${germanNumber(NORM_PORTIONS_MAX)} sein.`;
  }
  return null;
}

export function overridePortionsError(value: number | null): string | null {
  if (value === null || !Number.isInteger(value) || value < OVERRIDE_PORTIONS_MIN || value > OVERRIDE_PORTIONS_MAX) {
    return `Die Portionen müssen zwischen ${OVERRIDE_PORTIONS_MIN} und ${OVERRIDE_PORTIONS_MAX} liegen.`;
  }
  return null;
}
