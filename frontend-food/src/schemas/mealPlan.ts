/**
 * Zod schemas for MealPlan API.
 * MUST stay in sync with backend/planner/schemas.py (MealPlan section)
 */
import { z } from 'zod';
import { NutritionalTagSchema } from './supply';

// Lightweight nutritional tag schema for search results (backend only returns id+name)
export const NutritionalTagPreviewSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// ==========================================================================
// Variant Item (batch input)
// ==========================================================================

export const MealItemVariantInSchema = z.object({
  recipe_id: z.number(),
  factor: z.number().min(0.01).max(1),
  display_name: z.string().nullable().optional(),
  active_recipe_item_ids: z.array(z.number()),
});
export type MealItemVariantIn = z.infer<typeof MealItemVariantInSchema>;

export const MealItemBatchInSchema = z.object({
  items: z.array(MealItemVariantInSchema),
});
export type MealItemBatchIn = z.infer<typeof MealItemBatchInSchema>;

// ==========================================================================
// MealItem Override
// ==========================================================================

export const MealItemOverrideSchema = z.object({
  id: z.number(),
  recipe_item_id: z.number(),
  quantity_override: z.number().nullable(),
  excluded: z.boolean(),
});
export type MealItemOverride = z.infer<typeof MealItemOverrideSchema>;

// ==========================================================================
// MealItem
// ==========================================================================

export const MealItemSchema = z.object({
  id: z.number(),
  recipe_id: z.number().nullable(),
  recipe_title: z.string(),
  recipe_slug: z.string(),
  recipe_image: z.string().nullable(),
  ingredient_id: z.number().nullable(),
  ingredient_name: z.string(),
  ingredient_slug: z.string(),
  quantity: z.number().nullable(),
  measuring_unit_id: z.number().nullable(),
  measuring_unit_name: z.string(),
  display_name: z.string().nullable(),
  factor: z.number(),
  active_recipe_item_ids: z.array(z.number()),
  variant_group_id: z.string().nullable(),
  energy_kcal: z.number().nullable(),
  cost_eur: z.number().nullable(),
  quantity_g: z.number().nullable(),
  ingredient_tags: z.array(z.string()),
  recipe_type: z.string(),
  overrides: z.array(MealItemOverrideSchema),
  portion_display: z.string().default(''),
  has_missing_weight: z.boolean().default(false),
  is_per_norm_person: z.boolean().default(true),
});
export type MealItem = z.infer<typeof MealItemSchema>;

// ==========================================================================
// Meal (with start_datetime / end_datetime)
// ==========================================================================

export const MealSchema = z.object({
  id: z.number(),
  start_datetime: z.string().nullable(),
  end_datetime: z.string().nullable(),
  meal_type: z.string(),
  day_part_factor: z.number(),
  display_name: z.string(),
  override_portions: z.number().nullable(),
  note: z.string(),
  note_is_published: z.boolean(),
  is_reference: z.boolean(),
  ref_meal_id: z.number().nullable(),
  is_synced: z.boolean(),
  is_external: z.boolean(),
  external_energy_kcal: z.number().nullable(),
  external_cost_per_person: z.number().nullable(),
  total_energy_kcal: z.number(),
  total_cost_eur: z.number(),
  items: z.array(MealItemSchema),
});
export type Meal = z.infer<typeof MealSchema>;

// ==========================================================================
// MealPlan (list item)
// ==========================================================================

export const MealPlanSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  norm_portions: z.number(),
  reserve_factor: z.number(),
  budget_per_person_per_day: z.number().nullable(),
  event_id: z.number().nullable(),
  event_name: z.string(),
  start_datetime: z.string().nullable(),
  end_datetime: z.string().nullable(),
  created_by_id: z.number(),
  owner_id: z.number().nullable(),
  owner_name: z.string().nullable(),
  visibility: z.enum(['private', 'group', 'public', 'draft']).default('private'),
  created_at: z.string(),
  updated_at: z.string(),
  meals_count: z.number(),
  day_part_factors: z.record(z.string(), z.number()),
  meal_default_times: z.record(z.string(), z.array(z.string())),
  nutritional_tag_ids: z.array(z.number()).default([]),
  nutritional_tag_names: z.array(z.string()).default([]),
  is_template: z.boolean().default(false),
  is_owner: z.boolean().default(false),
  collaborators_count: z.number().default(0),
});
export type MealPlan = z.infer<typeof MealPlanSchema>;

// ==========================================================================
// MealPlan Detail (with nested meals/items)
// ==========================================================================

// ==========================================================================
// Collaborator
// ==========================================================================

export const COLLABORATOR_ROLE_LABELS: Record<string, string> = {
  viewer: 'Betrachter',
  editor: 'Bearbeiter',
  admin: 'Admin',
};

export const MealPlanCollaboratorSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  username: z.string().default(''),
  first_name: z.string().default(''),
  last_name: z.string().default(''),
  role: z.string(),
  created_at: z.string(),
});
export type MealPlanCollaborator = z.infer<typeof MealPlanCollaboratorSchema>;

export const MealPlanDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  norm_portions: z.number(),
  reserve_factor: z.number(),
  budget_per_person_per_day: z.number().nullable(),
  event_id: z.number().nullable(),
  event_name: z.string(),
  start_datetime: z.string().nullable(),
  end_datetime: z.string().nullable(),
  created_by_id: z.number(),
  owner_id: z.number().nullable(),
  owner_name: z.string().nullable(),
  visibility: z.enum(['private', 'group', 'public', 'draft']).default('private'),
  created_at: z.string(),
  updated_at: z.string(),
  day_part_factors: z.record(z.string(), z.number()),
  meal_default_times: z.record(z.string(), z.array(z.string())),
  meals: z.array(MealSchema),
  can_edit: z.boolean(),
  is_owner: z.boolean().default(false),
  collaborators: z.array(MealPlanCollaboratorSchema).default([]),
  nutritional_tag_ids: z.array(z.number()).default([]),
  nutritional_tags: z.array(NutritionalTagSchema).default([]),
  is_template: z.boolean().default(false),
});
export type MealPlanDetail = z.infer<typeof MealPlanDetailSchema>;

// ==========================================================================
// Nutrition Summary
// ==========================================================================

export const NutritionSummarySchema = z.object({
  // Total values (entire MealPlan)
  energy_kcal: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  carbohydrate_g: z.number(),
  sugar_g: z.number(),
  fibre_g: z.number(),
  salt_g: z.number(),

  // Per Normportion values (total / norm_portions)
  per_portion_energy_kcal: z.number(),
  per_portion_protein_g: z.number(),
  per_portion_fat_g: z.number(),
  per_portion_carbohydrate_g: z.number(),
  per_portion_sugar_g: z.number(),
  per_portion_fibre_g: z.number(),
  per_portion_salt_g: z.number(),

  // Scaling metadata
  norm_portions: z.number(),
  reserve_factor: z.number(),
  scaling_factor: z.number(),
});
export type NutritionSummary = z.infer<typeof NutritionSummarySchema>;

// ==========================================================================
// Shopping List Item
// ==========================================================================

export const ShoppingItemSourceSchema = z.object({
  recipe_id: z.number().nullable().optional(),
  recipe_name: z.string().default(''),
  recipe_slug: z.string().default(''),
  meal_label: z.string().default(''),
  quantity_g: z.number().default(0),
});

export const PortionOptionSchema = z.object({
  name: z.string(),
  display: z.string(),
  is_default: z.boolean(),
});

export const ShoppingListItemSchema = z.object({
  ingredient_id: z.number().nullable(),
  ingredient_name: z.string(),
  ingredient_slug: z.string().default(''),
  total_quantity_g: z.number(),
  unit: z.string(),
  retail_section: z.string(),
  estimated_price_eur: z.number().nullable(),
  display_quantity: z.string().default(''),
  display_text: z.string().default(''),
  natural_portions: z.string().default(''),
  portion_options: z.array(PortionOptionSchema).default([]),
  sources: z.array(ShoppingItemSourceSchema).default([]),
});
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;

// ==========================================================================
// Recipe Search Result (with preview fields)
// ==========================================================================

export const RecipeSearchResultSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  recipe_type: z.string(),
  image: z.string().nullable().optional(),
  portions: z.number().nullable().optional(),
  cached_energy_kcal: z.number().nullable().optional(),
  cached_protein_g: z.number().nullable().optional(),
  cached_fat_g: z.number().nullable().optional(),
  cached_carbohydrate_g: z.number().nullable().optional(),
  cached_price_total: z.number().nullable().optional(),
  cached_nutri_class: z.number().nullable().optional(),
  nutritional_tags: z.array(NutritionalTagPreviewSchema).optional(),
  usage_count: z.number().optional(),
  description: z.string().nullable().optional(),
  ingredients_preview: z.array(z.string()).optional(),
  recipe_badge: z.enum(["verified", "community", "draft"]).optional(),
  price_per_serving: z.number().nullable().optional(),
});
export type RecipeSearchResult = z.infer<typeof RecipeSearchResultSchema>;

// ==========================================================================
// Popular Recipes
// ==========================================================================

export const RecipePopularItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  recipe_type: z.string(),
  image: z.string().nullable(),
  usage_count: z.number(),
  recipe_badge: z.enum(["verified", "community", "draft"]).optional(),
  price_per_serving: z.number().nullable().optional(),
});
export type RecipePopularItem = z.infer<typeof RecipePopularItemSchema>;

export const RecipePopularResponseSchema = z.object({
  personal: z.array(RecipePopularItemSchema),
  community: z.array(RecipePopularItemSchema),
});
export type RecipePopularResponse = z.infer<typeof RecipePopularResponseSchema>;

// ==========================================================================
// Recipe Suggestions
// ==========================================================================

export const RecipeSuggestionSchema = z.object({
  id: z.number(),
  title: z.string(),
  usage_count: z.number(),
  image_thumbnail: z.string().nullable(),
  recipe_badge: z.enum(["verified", "community", "draft"]).optional(),
  price_per_serving: z.number().nullable().optional(),
  recipe_type: z.string().optional(),
});
export type RecipeSuggestion = z.infer<typeof RecipeSuggestionSchema>;

export const RecipeSuggestionsResponseSchema = z.array(RecipeSuggestionSchema);
export type RecipeSuggestionsResponse = z.infer<typeof RecipeSuggestionsResponseSchema>;

// ==========================================================================
// Recently Used Recipes
// ==========================================================================

export const RecipeRecentlyUsedSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  recipe_type: z.string(),
  image: z.string().nullable(),
  portions: z.number().nullable().optional(),
  usage_count: z.number().optional(),
  recipe_badge: z.enum(["verified", "community", "draft"]).optional(),
  price_per_serving: z.number().nullable().optional(),
  nutritional_tags: z.array(NutritionalTagPreviewSchema).optional(),
});
export type RecipeRecentlyUsed = z.infer<typeof RecipeRecentlyUsedSchema>;

export const RecentlyUsedResponseSchema = z.object({
  recipes: z.array(RecipeRecentlyUsedSchema),
});
export type RecentlyUsedResponse = z.infer<typeof RecentlyUsedResponseSchema>;

export const IngredientPortionSchema = z.object({
  id: z.number(),
  name: z.string(),
  measuring_unit: z.string().nullable(),
  measuring_unit_id: z.number().nullable(),
  quantity: z.number().nullable(),
  weight_g: z.number().nullable(),
});
export type IngredientPortion = z.infer<typeof IngredientPortionSchema>;

export const IngredientSearchResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  energy_kcal: z.number().nullable().optional(),
  protein_g: z.number().nullable().optional(),
  fat_g: z.number().nullable().optional(),
  carbohydrate_g: z.number().nullable().optional(),
  nutri_class: z.number().nullable().optional(),
  price_per_kg: z.number().nullable().optional(),
  usage_count: z.number().optional(),
  description: z.string().nullable().optional(),
  status: z.string().optional(),
  nutritional_tags: z.array(NutritionalTagPreviewSchema).optional(),
  portions: z.array(IngredientPortionSchema),
});
export type IngredientSearchResult = z.infer<typeof IngredientSearchResultSchema>;

export const UnifiedSearchResponseSchema = z.object({
  recipes: z.array(RecipeSearchResultSchema),
  ingredients: z.array(IngredientSearchResultSchema),
  fallback_applied: z.boolean().optional(),
});
export type UnifiedSearchResponse = z.infer<typeof UnifiedSearchResponseSchema>;

// ==========================================================================
// Meal Type Labels (German)
// ==========================================================================

export const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

// ==========================================================================
// AI Meal Plan Generation
// ==========================================================================

export const AiSuggestMealSchema = z.object({
  meal_type: z.string(),
  recipe_id: z.number(),
  recipe_title: z.string(),
});
export type AiSuggestMeal = z.infer<typeof AiSuggestMealSchema>;

export const AiSuggestDaySchema = z.object({
  date: z.string(),
  meals: z.array(AiSuggestMealSchema),
});
export type AiSuggestDay = z.infer<typeof AiSuggestDaySchema>;

export const AiSuggestOutSchema = z.object({
  days: z.array(AiSuggestDaySchema),
});
export type AiSuggestOut = z.infer<typeof AiSuggestOutSchema>;

// ==========================================================================
// Wizard State schemas
// ==========================================================================

export const MealPlanWizardStrategySchema = z.enum(['empty', 'reference', 'ai']);
export type MealPlanWizardStrategy = z.infer<typeof MealPlanWizardStrategySchema>;

export const MealPlanWizardStateSchema = z.object({
  version: z.number().default(1),

  name: z.string().default(''),
  description: z.string().default(''),
  norm_portions: z.number().default(10),
  reserve_factor: z.number().default(1.1),
  budget_per_person_per_day: z.number().nullable().default(null),
  start_datetime: z.string().default(''),
  end_datetime: z.string().default(''),
  visibility: z.enum(['private', 'group', 'public', 'draft']).default('private'),
  is_template: z.boolean().default(false),

  day_part_factors: z.record(z.string(), z.number()).default({
    breakfast: 0.25,
    lunch: 0.35,
    dinner: 0.30,
    snack: 0.10,
  }),
  meal_default_times: z.record(z.string(), z.array(z.string())).default({
    breakfast: ['08:00', '09:00'],
    lunch: ['12:00', '13:00'],
    dinner: ['18:00', '19:00'],
    snack: ['15:00', '15:30'],
  }),

  nutritional_tag_ids: z.array(z.number()).default([]),

  strategy: MealPlanWizardStrategySchema.default('empty'),
  reference_plan_id: z.number().nullable().default(null),
  reference_plan_name: z.string().default(''),
  ai_prompt: z.string().default(''),
  ai_suggestions: z.any().nullable().default(null),
});

export type MealPlanWizardState = z.infer<typeof MealPlanWizardStateSchema>;

export function defaultWizardState(): MealPlanWizardState {
  return {
    version: 1,
    name: '',
    description: '',
    norm_portions: 10,
    reserve_factor: 1.1,
    budget_per_person_per_day: null,
    start_datetime: '',
    end_datetime: '',
    visibility: 'private',
    is_template: false,
    day_part_factors: { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 },
    meal_default_times: {
      breakfast: ['08:00', '09:00'],
      lunch: ['12:00', '13:00'],
      dinner: ['18:00', '19:00'],
      snack: ['15:00', '15:30'],
    },
    nutritional_tag_ids: [],
    strategy: 'empty',
    reference_plan_id: null,
    reference_plan_name: '',
    ai_prompt: '',
    ai_suggestions: null,
  };
}

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
};

export const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: 'bakery_dining',
  lunch: 'restaurant',
  dinner: 'dinner_dining',
  snack: 'cookie',
};

export const MEAL_TYPE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  breakfast: { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-300' },
  lunch: { text: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-300' },
  dinner: { text: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-300' },
  snack: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300' },
};

export type CoverageStatus = 'good' | 'warning' | 'critical';

/**
 * Täglicher kcal-Bedarf der systemweiten Norm-Person.
 * Entspricht PAL 1.75 (2335 kcal) – fester Wert, identisch zur Norm-Portion-Definition.
 */
export const NORM_PERSON_DAILY_KCAL = 2335;

/** Calculate how well a meal covers its expected calorie share. */
export function getCoverageStatus(
  energyKcal: number,
  dayPartFactor: number,
): { percent: number; status: CoverageStatus } {
  // Basis-Tagesbedarf: fester Norm-Person-Wert (PAL 1.75 = 2335 kcal)
  const expectedKcal = NORM_PERSON_DAILY_KCAL * dayPartFactor;
  if (expectedKcal <= 0) return { percent: 0, status: 'critical' };
  const percent = Math.round((energyKcal / expectedKcal) * 100);
  let status: CoverageStatus = 'good';
  if (percent < 50 || percent > 150) status = 'critical';
  else if (percent < 80 || percent > 120) status = 'warning';
  return { percent, status };
}

// Default start/end times per meal type (minutes since midnight)
// Sync with backend planner/models/meal_plan.py MEAL_TYPE_DEFAULT_TIMES
export const MEAL_TYPE_DEFAULT_TIMES: Record<string, [number, number]> = {
  breakfast: [8 * 60, 9 * 60],
  lunch: [12 * 60, 13 * 60],
  dinner: [18 * 60, 19 * 60],
  snack: [15 * 60, 15 * 60 + 30],
};

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Format a meal datetime as HH:MM in the fixed plan timezone (Europe/Berlin).
 * Lager times are location-fixed and must not shift with the viewer's browser timezone.
 */
export function formatMealTime(datetimeStr: string | null | undefined): string {
  if (!datetimeStr) return '';
  const d = new Date(datetimeStr);
  return d.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Berlin',
  });
}

/** Effective portions for a meal: override_portions when set, else the plan's norm_portions. */
export function effectivePortions(
  meal: Pick<Meal, 'override_portions'>,
  normPortions: number,
): number {
  if (meal.override_portions != null) return meal.override_portions;
  return normPortions || 1;
}

function parseTimeToMinutes(datetimeStr: string): number {
  const d = new Date(datetimeStr);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Sum of day_part_factors for meals on a day.
 * NOT capped: values > 1.0 represent overplanning and must stay visible.
 */
export function getDayCoverage(meals: Meal[]): number {
  return meals.reduce((sum, m) => sum + m.day_part_factor, 0);
}

/**
 * Effective coverage for KPI/rule scaling: floor 0.35, capped at 1.0.
 * Overplanning (>100%) must NOT scale the nutrition target bands upward.
 */
export function getEffectiveCoverage(coverage: number): number {
  return Math.min(Math.max(coverage, 0.35), 1.0);
}

export function getCoverageBadge(coverage: number): { label: string; status: 'green' | 'yellow' | 'red' | 'overplanned'; effectiveCoverage: number } {
  const effectiveCoverage = getEffectiveCoverage(coverage);
  const pct = Math.round(coverage * 100);
  if (coverage > 1.0) return { label: `Überplant ${pct} %`, status: 'overplanned', effectiveCoverage };
  if (coverage >= 0.8) return { label: 'Vollständig', status: 'green', effectiveCoverage };
  if (coverage >= 0.35) return { label: `Teilweise ${pct} %`, status: 'yellow', effectiveCoverage };
  return { label: `Lückenhaft ${pct} %`, status: 'red', effectiveCoverage };
}

/** Read meal_default_times from plan data with fallback to hardcoded defaults. */
export function getMealDefaultTimes(
  mealDefaultTimes?: Record<string, string[]> | null,
): Record<string, [number, number]> {
  if (mealDefaultTimes) {
    const result: Record<string, [number, number]> = {};
    for (const [key, times] of Object.entries(mealDefaultTimes)) {
      if (times.length < 2) continue;
      const [sh, sm] = times[0].split(':').map(Number);
      const [eh, em] = times[1].split(':').map(Number);
      result[key] = [sh * 60 + sm, eh * 60 + em];
    }
    return result;
  }
  return { ...MEAL_TYPE_DEFAULT_TIMES };
}

/** Determine which meal types are naturally absent on boundary days (first/last). */
export function getSkippedMealTypes(
  date: string,
  startDatetime?: string | null,
  endDatetime?: string | null,
): string[] {
  if (!startDatetime || !endDatetime) return [];
  const isFirst = date === startDatetime.slice(0, 10);
  const isLast = date === endDatetime.slice(0, 10);
  if (!isFirst && !isLast) return [];

  const startMinutes = isFirst ? parseTimeToMinutes(startDatetime) : 0;
  const endMinutes = isLast ? parseTimeToMinutes(endDatetime) : 24 * 60;
  const skipped: string[] = [];

  for (const [mealType, [mtStart, mtEnd]] of Object.entries(MEAL_TYPE_DEFAULT_TIMES)) {
    if (isFirst && mtStart < startMinutes) skipped.push(mealType);
    if (isLast && mtEnd > endMinutes) skipped.push(mealType);
  }
  return skipped;
}

// ==========================================================================
// Backward compatibility re-exports
// ==========================================================================

// ==========================================================================
// Cost Summary
// ==========================================================================

export const MealCostSchema = z.object({
  meal_id: z.number(),
  meal_type: z.string(),
  date: z.string(),
  cost: z.coerce.number(),
  cost_per_person: z.coerce.number(),
});
export type MealCost = z.infer<typeof MealCostSchema>;

export const DayCostSchema = z.object({
  date: z.string(),
  total_cost: z.coerce.number(),
  cost_per_person: z.coerce.number(),
  meals: z.array(MealCostSchema),
});
export type DayCost = z.infer<typeof DayCostSchema>;

export const RecipeCostSchema = z.object({
  recipe_id: z.number(),
  recipe_title: z.string(),
  recipe_slug: z.string(),
  total_cost: z.coerce.number(),
  cost_per_person: z.coerce.number(),
  priced_ingredients: z.number().default(0),
  total_ingredients: z.number().default(0),
});
export type RecipeCost = z.infer<typeof RecipeCostSchema>;

export const MealPlanCostSummarySchema = z.object({
  total_cost: z.coerce.number(),
  total_cost_with_reserve: z.coerce.number(),
  reserve_factor: z.coerce.number(),
  cost_per_person: z.coerce.number(),
  norm_portions: z.number(),
  total_ingredients: z.number(),
  priced_ingredients: z.number(),
  days: z.array(DayCostSchema),
  recipes: z.array(RecipeCostSchema),
});
export type MealPlanCostSummary = z.infer<typeof MealPlanCostSummarySchema>;

// ==========================================================================
// MealPlan Duplicate Input
// ==========================================================================

export const MealPlanDuplicateInSchema = z.object({
  name: z.string().min(1),
  start_datetime: z.string().min(1),
  norm_portions: z.number().int().min(1),
});
export type MealPlanDuplicateIn = z.infer<typeof MealPlanDuplicateInSchema>;

// ==========================================================================
// RefMeal (Reference Meal)
// ==========================================================================

export const RefMealSchema = z.object({
  id: z.number(),
  meal_type: z.string(),
  day_part_factor: z.number(),
  items: z.array(MealItemSchema),
  synced_meals_count: z.number(),
  total_meals_count: z.number(),
});
export type RefMeal = z.infer<typeof RefMealSchema>;

export const RefMealItemInSchema = z.object({
  recipe_id: z.number().nullable().optional(),
  ingredient_id: z.number().nullable().optional(),
  quantity: z.number().nullable().optional(),
  measuring_unit_id: z.number().nullable().optional(),
  display_name: z.string().nullable().optional(),
  factor: z.number().default(1.0),
});
export type RefMealItemIn = z.infer<typeof RefMealItemInSchema>;

export const RefMealCreateInSchema = z.object({
  meal_type: z.string(),
  day_part_factor: z.number().optional(),
  items: z.array(RefMealItemInSchema).optional(),
});
export type RefMealCreateIn = z.infer<typeof RefMealCreateInSchema>;

export const RefMealUpdateInSchema = z.object({
  day_part_factor: z.number().optional(),
  items: z.array(RefMealItemInSchema).optional(),
});
export type RefMealUpdateIn = z.infer<typeof RefMealUpdateInSchema>;

export const LinkMealInSchema = z.object({
  ref_meal_id: z.number(),
});
export type LinkMealIn = z.infer<typeof LinkMealInSchema>;

// ==========================================================================
// Meal Update / Actions Input
// ==========================================================================

export const MealUpdateInSchema = z.object({
  override_portions: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  note_is_published: z.boolean().nullable().optional(),
  day_part_factor: z.number().nullable().optional(),
  is_external: z.boolean().nullable().optional(),
  external_energy_kcal: z.number().nullable().optional(),
  external_cost_per_person: z.number().nullable().optional(),
  start_datetime: z.string().nullable().optional(),
  end_datetime: z.string().nullable().optional(),
});
export type MealUpdateIn = z.infer<typeof MealUpdateInSchema>;

export const CopyItemsFromPlanInSchema = z.object({
  source_plan_id: z.number(),
  source_meal_id: z.number(),
  note: z.string().optional(),
});
export type CopyItemsFromPlanIn = z.infer<typeof CopyItemsFromPlanInSchema>;

// ==========================================================================
// MealPlan Filter Options
// ==========================================================================

export const MEALPLAN_ORIGIN_OPTIONS = [
  { value: 'all', label: 'Alle', icon: 'public' },
  { value: 'mine', label: 'Meine Pläne', icon: 'person' },
  { value: 'shared', label: 'Geteilt mit mir', icon: 'group' },
  { value: 'template', label: 'Referenz-Vorlagen', icon: 'star' },
  { value: 'verified', label: 'Inspi-verifiziert', icon: 'verified' },
  { value: 'community', label: 'Community', icon: 'groups' },
] as const;

export const MEALPLAN_SORT_OPTIONS = [
  { value: 'date_newest', label: 'Neuestes Datum' },
  { value: 'date_oldest', label: 'Ältestes Datum' },
  { value: 'name_asc', label: 'Name A-Z' },
  { value: 'name_desc', label: 'Name Z-A' },
] as const;

// ==========================================================================
// Allergen Scanner
// ==========================================================================

export const NutritionalTagViolationSchema = z.object({
  meal_id: z.number(),
  meal_type: z.string(),
  date: z.string(),
  recipe_id: z.number().nullable(),
  recipe_title: z.string(),
  recipe_slug: z.string(),
  nutritional_tag: NutritionalTagSchema,
  source: z.string().default('recipe_tag'),
});
export type NutritionalTagViolation = z.infer<typeof NutritionalTagViolationSchema>;

export const NutritionalTagScanSummarySchema = z.object({
  total_violations: z.number(),
  affected_meals: z.number(),
  unique_tags: z.number(),
});
export type NutritionalTagScanSummary = z.infer<typeof NutritionalTagScanSummarySchema>;

export const NutritionalTagScanResponseSchema = z.object({
  nutritional_tags: z.array(NutritionalTagSchema),
  violations: z.array(NutritionalTagViolationSchema),
  summary: NutritionalTagScanSummarySchema,
});
export type NutritionalTagScanResponse = z.infer<typeof NutritionalTagScanResponseSchema>;

// ==========================================================================
// Cooking Schedule (Kochplan)
// ==========================================================================

export const CookingScheduleStepSchema = z.object({
  text: z.string(),
  timer: z.number().nullable(),
});
export type CookingScheduleStep = z.infer<typeof CookingScheduleStepSchema>;

export const CookingScheduleIngredientSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  note: z.string(),
  is_optional: z.boolean(),
  weight_g: z.number().nullable(),
  nutritional_tags: z.array(NutritionalTagSchema).default([]),
});
export type CookingScheduleIngredient = z.infer<typeof CookingScheduleIngredientSchema>;

export const CookingScheduleItemSchema = z.object({
  recipe_id: z.number(),
  recipe_title: z.string(),
  recipe_slug: z.string(),
  meal_type: z.string(),
  serving_time: z.string(),
  lead_minutes: z.number(),
  start_time: z.string(),
  portions: z.number(),
  steps: z.string(),
  ingredients: z.array(CookingScheduleIngredientSchema),
  steps_parsed: z.array(CookingScheduleStepSchema).default([]),
  nutritional_tags: z.array(NutritionalTagSchema).default([]),
  total_cost_eur: z.number(),
  total_energy_kcal: z.number(),
  total_protein_g: z.number(),
  total_fat_g: z.number(),
  total_carbohydrate_g: z.number(),
  meal_note: z.string(),
});
export type CookingScheduleItem = z.infer<typeof CookingScheduleItemSchema>;

export const CookingScheduleDaySchema = z.object({
  date: z.string(),
  items: z.array(CookingScheduleItemSchema),
  day_start_time: z.string(),
  day_end_time: z.string(),
  day_duration_minutes: z.number(),
  portions: z.number(),
  day_nutritional_tags: z.array(NutritionalTagSchema).default([]),
  total_cost_eur: z.number(),
  total_energy_kcal: z.number(),
});
export type CookingScheduleDay = z.infer<typeof CookingScheduleDaySchema>;

export const CookingScheduleSchema = z.object({
  days: z.array(CookingScheduleDaySchema),
  excluded_meal_count: z.number(),
  total_cost_eur: z.number(),
  total_cost_with_reserve: z.number(),
  total_energy_kcal: z.number(),
  norm_portions: z.number(),
});
export type CookingSchedule = z.infer<typeof CookingScheduleSchema>;

// ==========================================================================
// MealPlan Card Helpers
// ==========================================================================

export function getPlanBadge(plan: { owner_id: number | null; visibility: string }, userId?: number): 'verified' | 'community' | 'personal' {
  if (plan.owner_id === null) return 'verified';
  if (plan.visibility === 'public') return 'community';
  if (userId && plan.owner_id === userId) return 'personal';
  return 'community';
}

export function formatDateRange(startDatetime?: string | null, endDatetime?: string | null): string | null {
  if (!startDatetime && !endDatetime) return null;
  const start = startDatetime ? new Date(startDatetime) : null;
  const end = endDatetime ? new Date(endDatetime) : null;
  const fmt = (d: Date) =>
    d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  if (start && end) {
    if (start.toDateString() === end.toDateString()) return fmt(start);
    return `${fmt(start)} – ${fmt(end)}`;
  }
  if (start) return `ab ${fmt(start)}`;
  if (end) return `bis ${fmt(end)}`;
  return null;
}

export function getDaysCount(startDatetime?: string | null, endDatetime?: string | null): number {
  if (!startDatetime || !endDatetime) return 0;
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
}

// ==========================================================================
// Backward compatibility re-exports
// ==========================================================================

/** @deprecated Use MealPlanSchema */
export const MealEventSchema = MealPlanSchema;
/** @deprecated Use MealPlan */
export type MealEvent = MealPlan;
/** @deprecated Use MealPlanDetailSchema */
export const MealEventDetailSchema = MealPlanDetailSchema;
/** @deprecated Use MealPlanDetail */
export type MealEventDetail = MealPlanDetail;
