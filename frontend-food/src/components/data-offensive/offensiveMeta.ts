/** Display metadata for the data offensive cockpit. Codes come from the backend. */
import type { OffensiveIngredient } from '@/schemas/dataOffensive';

export type NutritionField =
  | 'energy_kcal'
  | 'protein_g'
  | 'fat_g'
  | 'fat_sat_g'
  | 'carbohydrate_g'
  | 'sugar_g'
  | 'fibre_g'
  | 'salt_g';

export const NUTRITION_COLUMNS: { field: NutritionField; label: string; unit: string }[] = [
  { field: 'energy_kcal', label: 'kcal', unit: '' },
  { field: 'protein_g', label: 'Eiweiß', unit: 'g' },
  { field: 'fat_g', label: 'Fett', unit: 'g' },
  { field: 'fat_sat_g', label: 'ges. FS', unit: 'g' },
  { field: 'carbohydrate_g', label: 'KH', unit: 'g' },
  { field: 'sugar_g', label: 'Zucker', unit: 'g' },
  { field: 'fibre_g', label: 'Ballast.', unit: 'g' },
  { field: 'salt_g', label: 'Salz', unit: 'g' },
];

/** Which nutrition fields a rule-engine issue points at (mirrors nutrition_plausibility.py). */
const ISSUE_FIELDS: Record<string, NutritionField[]> = {
  broken_import: ['energy_kcal', 'fat_g', 'carbohydrate_g'],
  energy_kj_as_kcal: ['energy_kcal'],
  energy_too_high: ['energy_kcal'],
  energy_missing: ['energy_kcal'],
  energy_mismatch: ['energy_kcal', 'protein_g', 'fat_g', 'carbohydrate_g'],
  sugar_gt_carbs: ['sugar_g', 'carbohydrate_g'],
  sat_fat_gt_fat: ['fat_sat_g', 'fat_g'],
  macro_sum_gt_100: ['protein_g', 'fat_g', 'carbohydrate_g', 'fibre_g'],
  all_zero: ['energy_kcal', 'protein_g', 'fat_g', 'carbohydrate_g'],
  macros_missing: ['protein_g', 'fat_g', 'carbohydrate_g'],
  salt_sodium_mismatch: ['salt_g'],
};

export function flaggedFields(ingredient: OffensiveIngredient): Set<NutritionField> {
  const fields = new Set<NutritionField>();
  ingredient.nutrition_issues.forEach((code) => ISSUE_FIELDS[code]?.forEach((field) => fields.add(field)));
  return fields;
}

export const VERDICT_LABELS: Record<string, string> = {
  ok: 'Plausibel',
  corrected: 'KI-korrigiert',
  rename: 'Umbenennen',
  duplicate: 'Duplikat?',
  not_an_ingredient: 'Keine Zutat',
};

/** Issues shown as KPI tiles, in order of importance. */
export const KPI_ISSUES: string[] = [
  'nutrition_implausible',
  'nutrition_missing',
  'price_missing',
  'section_missing',
  'suggestions_pending',
  'rename_suggested',
  'duplicate_suggested',
  'suspect_name',
  'description_missing',
  'embedding_missing',
  'not_reviewed',
];

/** Issues that are problems (red) vs. to-dos (neutral). */
export const CRITICAL_ISSUES = new Set([
  'nutrition_implausible',
  'nutrition_missing',
  'suspect_name',
  'duplicate_suggested',
]);

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  verified: 'Veröffentlicht',
  user_content: 'Nutzer',
};

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return '–';
  return value.toLocaleString('de-DE', { maximumFractionDigits: digits });
}

export function formatEuro(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}
