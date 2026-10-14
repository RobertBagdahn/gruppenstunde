import type { MealPlanWizardState } from '@/schemas/mealPlan';
import {
  DAY_PART_FACTORS_SUM_MAX,
  NORM_PORTIONS_MAX,
  PLAN_MAX_DAYS,
  dayPartFactorError,
  reserveFactorError,
} from '@/lib/mealPlanBounds';

export interface BasicsErrors {
  portions?: string;
  period?: string;
  reserve?: string;
  dayParts?: string;
}

/** Problems of the first wizard step that would only surface as a server error later. */
export function validateBasics(
  state: Pick<MealPlanWizardState, 'norm_portions' | 'start_datetime' | 'end_datetime'> & { reserve_factor?: number; day_part_factors?: Record<string, number> },
): BasicsErrors {
  const errors: BasicsErrors = {};
  if (!Number.isFinite(state.norm_portions) || state.norm_portions < 1) {
    errors.portions = 'Mindestens 1 Person.';
  } else if (state.norm_portions > NORM_PORTIONS_MAX) {
    errors.portions = 'Höchstens 1.000 Personen.';
  }
  // datetime-local values ("2026-10-10T18:00") compare correctly as text.
  if (state.start_datetime && state.end_datetime && state.end_datetime <= state.start_datetime) {
    errors.period = 'Das Ende muss nach dem Start liegen.';
  } else if (state.start_datetime && state.end_datetime) {
    const days = Math.floor((Date.parse(state.end_datetime.slice(0, 10)) - Date.parse(state.start_datetime.slice(0, 10))) / 86_400_000) + 1;
    if (days > PLAN_MAX_DAYS) errors.period = `Ein Plan darf höchstens ${PLAN_MAX_DAYS} Tage umfassen.`;
  }
  if (state.day_part_factors) {
    const values = Object.values(state.day_part_factors);
    const single = values.map(dayPartFactorError).find((message) => message !== null);
    if (single) errors.dayParts = single;
    else if (values.reduce((sum, value) => sum + value, 0) > DAY_PART_FACTORS_SUM_MAX) {
      errors.dayParts = 'Die Tagesanteile dürfen zusammen höchstens 1,5 ergeben.';
    }
  }
  if (state.reserve_factor !== undefined) {
    const reserve = reserveFactorError(state.reserve_factor);
    if (reserve) errors.reserve = reserve;
  }
  return errors;
}
