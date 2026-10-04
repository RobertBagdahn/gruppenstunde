/**
 * Client-side mirror of the hard nutrition rules in
 * backend/supply/services/nutrition_plausibility.py (HARD_ISSUE_CODES).
 * Keep thresholds and rules in sync; shared cases live in nutritionValidation.test.ts and
 * backend/supply/tests/test_ingredient_nutrition_validation.py.
 */

export const NUTRITION_FIELDS = [
  'energy_kcal',
  'protein_g',
  'fat_g',
  'fat_sat_g',
  'carbohydrate_g',
  'sugar_g',
  'fibre_g',
  'salt_g',
  'sodium_mg',
] as const;

export type NutritionField = (typeof NUTRITION_FIELDS)[number];
export type NutritionValues = Partial<Record<NutritionField, number | null | undefined>>;
export type NutritionFieldErrors = Partial<Record<NutritionField, string>>;

const GRAM_FIELDS: readonly NutritionField[] = [
  'protein_g',
  'fat_g',
  'fat_sat_g',
  'carbohydrate_g',
  'sugar_g',
  'fibre_g',
  'salt_g',
];
const MAX_KJ_PER_100G = 3800;
const MACRO_SUM_LIMIT = 105;

function num(values: NutritionValues, field: NutritionField): number | null {
  const value = values[field];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Field → German message for physically impossible nutrition values (per 100 g). Empty when plausible. */
export function validateNutritionValues(values: NutritionValues): NutritionFieldErrors {
  const errors: NutritionFieldErrors = {};

  for (const field of NUTRITION_FIELDS) {
    const value = num(values, field);
    if (value === null) continue;
    if (value < 0) errors[field] = 'Der Wert darf nicht negativ sein.';
    else if (GRAM_FIELDS.includes(field) && value > 100) errors[field] = 'Mehr als 100 g pro 100 g ist nicht möglich.';
    else if (field === 'energy_kcal' && value > MAX_KJ_PER_100G) errors[field] = 'Energie über 3.800 ist nicht möglich.';
  }

  const protein = num(values, 'protein_g');
  const fat = num(values, 'fat_g');
  const sat = num(values, 'fat_sat_g');
  const carbs = num(values, 'carbohydrate_g');
  const sugar = num(values, 'sugar_g');
  const fibre = num(values, 'fibre_g');
  const energy = num(values, 'energy_kcal');

  const allZero = [energy, protein, fat, carbs].every((value) => value === 0);
  if (allZero) return errors;

  const brokenImport = (fat === 0 && sat !== null && sat > 0) || (carbs === 0 && sugar !== null && sugar > 0);
  if (!brokenImport) {
    if (carbs !== null && carbs > 0 && sugar !== null && sugar > carbs + 0.5) {
      errors.sugar_g ??= 'Zucker darf nicht größer als die Kohlenhydrate sein.';
    }
    if (fat !== null && fat > 0 && sat !== null && sat > fat + 0.1) {
      errors.fat_sat_g ??= 'Gesättigte Fettsäuren dürfen nicht größer als das Fett sein.';
    }
  }

  const macroSum = (protein ?? 0) + (fat ?? 0) + (carbs ?? 0) + (fibre ?? 0);
  if (macroSum > MACRO_SUM_LIMIT) {
    const message = 'Eiweiß, Fett, Kohlenhydrate und Ballaststoffe ergeben zusammen mehr als 100 g.';
    for (const field of ['protein_g', 'fat_g', 'carbohydrate_g', 'fibre_g'] as const) {
      if (num(values, field) !== null) errors[field] ??= message;
    }
  }

  return errors;
}

/** Map backend `fields` (from a 422 `nutrition_implausible`) to inline messages. */
export function fieldErrorsFromApi(fields: readonly string[], message: string): NutritionFieldErrors {
  const errors: NutritionFieldErrors = {};
  for (const field of fields) {
    if ((NUTRITION_FIELDS as readonly string[]).includes(field)) errors[field as NutritionField] = message;
  }
  return errors;
}
