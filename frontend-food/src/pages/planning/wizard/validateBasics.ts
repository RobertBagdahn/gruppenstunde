import type { MealPlanWizardState } from '@/schemas/mealPlan';

export interface BasicsErrors {
  portions?: string;
  period?: string;
}

/** Problems of the first wizard step that would only surface as a server error later. */
export function validateBasics(
  state: Pick<MealPlanWizardState, 'norm_portions' | 'start_datetime' | 'end_datetime'>,
): BasicsErrors {
  const errors: BasicsErrors = {};
  if (!Number.isFinite(state.norm_portions) || state.norm_portions < 1) {
    errors.portions = 'Mindestens 1 Person.';
  } else if (state.norm_portions > 1000) {
    errors.portions = 'Höchstens 1.000 Personen.';
  }
  // datetime-local values ("2026-10-10T18:00") compare correctly as text.
  if (state.start_datetime && state.end_datetime && state.end_datetime <= state.start_datetime) {
    errors.period = 'Das Ende muss nach dem Start liegen.';
  }
  return errors;
}
