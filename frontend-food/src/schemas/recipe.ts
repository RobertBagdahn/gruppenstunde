/**
 * Zod schemas for Recipe API.
 * MUST stay in sync with backend/recipe/schemas.py
 *
 * Recipe now extends Content base schemas (ContentListItem, ContentDetail).
 */
import { z } from 'zod';
import {
  ContentListItemSchema,
  ContentDetailSchema,
} from './content';
import { PortionSchema } from './supply';

// --- NutritionalTag (from supply) ---

export const NutritionalTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  name_opposite: z.string(),
  description: z.string(),
  rank: z.number(),
  is_dangerous: z.boolean(),
});
export type NutritionalTag = z.infer<typeof NutritionalTagSchema>;

// --- RecipeItem ---

export const RecipeItemSchema = z.object({
  id: z.number(),
  portion_id: z.number(),
  portion_name: z.string().nullable().optional(),
  ingredient_id: z.number().nullable().optional(),
  ingredient_name: z.string().default(''),
  ingredient_slug: z.string().nullable().optional(),
  quantity: z.number(),
  measuring_unit_id: z.number().nullable().optional(),
  measuring_unit_name: z.string().nullable().optional(),
  sort_order: z.number(),
  note: z.string(),
  ingredient_portions: z.array(PortionSchema).default([]),
  ingredient_density: z.number().nullable().optional(),
  ingredient_viscosity: z.string().nullable().optional(),
  ingredient_price_per_kg: z.number().nullable().optional(),
  ingredient_nutri_class: z.number().nullable().optional(),
  ingredient_retail_section_id: z.number().nullable().optional(),
  ingredient_retail_section_name: z.string().nullable().optional(),
  weight_g: z.number(),
  is_optional: z.boolean().catch(false),
  exchange_group_id: z.number().nullable().optional(),
  exchange_position: z.number().nullable().optional(),
});
export type RecipeItem = z.output<typeof RecipeItemSchema>;

// --- RecipeItemExchangeGroup ---

export const ExchangeGroupMemberSchema = z.object({
  recipe_item_id: z.number(),
  exchange_position: z.number().nullable().optional(),
  portion_id: z.number(),
  ingredient_name: z.string().default(''),
  quantity: z.number(),
});
export type ExchangeGroupMember = z.infer<typeof ExchangeGroupMemberSchema>;

export const RecipeItemExchangeGroupSchema = z.object({
  id: z.number(),
  recipe_id: z.number(),
  name: z.string().default(''),
  members: z.array(ExchangeGroupMemberSchema).default([]),
});
export type RecipeItemExchangeGroup = z.infer<typeof RecipeItemExchangeGroupSchema>;

// --- Recipe List Item (extends ContentListItem) ---

export const RecipeListItemSchema = ContentListItemSchema.extend({
  recipe_type: z.string(),
  portions: z.number().nullable(),
  // Cached nutritional values (denormalized, per-100g)
  cached_energy_kcal: z.number().nullable().optional(),
  cached_protein_g: z.number().nullable().optional(),
  cached_fat_g: z.number().nullable().optional(),
  cached_carbohydrate_g: z.number().nullable().optional(),
  cached_sugar_g: z.number().nullable().optional(),
  cached_fibre_g: z.number().nullable().optional(),
  cached_salt_g: z.number().nullable().optional(),
  cached_nutri_class: z.number().nullable().optional(),
  cached_price_total: z.number().nullable().optional(),
  cached_at: z.string().nullable().optional(),
  // Cached micronutrient values
  cached_vitamin_c_mg: z.number().nullable().optional(),
  // Personal recipe fields
  owner_name: z.string().nullable().optional(),
  forked_from_title: z.string().nullable().optional(),
  visibility: z.string().nullable().optional(),
  recipe_badge: z.string().nullable().optional(), // "verified" | "community" | "personal"
});
export type RecipeListItem = z.infer<typeof RecipeListItemSchema>;

// --- Recipe Similar ---

export const RecipeSimilarSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  distance: z.number(),
});
export type RecipeSimilar = z.infer<typeof RecipeSimilarSchema>;

// --- Recipe Detail (extends ContentDetail) ---

export const RecipeDetailSchema = ContentDetailSchema.extend({
  recipe_type: z.string(),
  portions: z.number().nullable(),
  // Cached nutritional values (denormalized, per-100g)
  cached_energy_kcal: z.number().nullable().optional(),
  cached_protein_g: z.number().nullable().optional(),
  cached_fat_g: z.number().nullable().optional(),
  cached_carbohydrate_g: z.number().nullable().optional(),
  cached_sugar_g: z.number().nullable().optional(),
  cached_fibre_g: z.number().nullable().optional(),
  cached_salt_g: z.number().nullable().optional(),
  cached_nutri_class: z.number().nullable().optional(),
  cached_price_total: z.number().nullable().optional(),
  cached_at: z.string().nullable().optional(),
  // Cached micronutrient values
  cached_vitamin_c_mg: z.number().nullable().optional(),
  // Personal recipe fields
  owner_name: z.string().nullable().optional(),
  forked_from_title: z.string().nullable().optional(),
  forked_from_slug: z.string().nullable().optional(),
  visibility: z.string().nullable().optional(),
  source_url: z.string().optional().default(''),
  recipe_badge: z.string().nullable().optional(), // "verified" | "community" | "personal"
  is_owner: z.boolean().default(false),
  usage_in_meal_plans_count: z.number().default(0),
  nutritional_tags: z.array(NutritionalTagSchema).default([]),
  recipe_items: z.array(RecipeItemSchema).default([]),
  next_best_recipes: z.array(RecipeSimilarSchema).default([]),
});
export type RecipeDetail = z.output<typeof RecipeDetailSchema>;

// --- Pagination ---

export const PaginatedRecipesSchema = z.object({
  items: z.array(RecipeListItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedRecipes = z.infer<typeof PaginatedRecipesSchema>;

export const PaginatedRecipeSimilarSchema = z.object({
  items: z.array(RecipeSimilarSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedRecipeSimilar = z.infer<typeof PaginatedRecipeSimilarSchema>;

// --- Filter ---

export const RecipeFilterSchema = z.object({
  q: z.string().optional(),
  recipe_type: z.string().optional(),
  scout_level_ids: z.array(z.number()).optional(),
  tag_slugs: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
  costs_min: z.number().optional(),
  costs_max: z.number().optional(),
  execution_time: z.string().optional(),
  origin: z.string().optional(), // "all" | "verified" | "community" | "mine"
  sort: z.string().default('newest'),
  page: z.number().default(1),
  page_size: z.number().default(20),
});
export type RecipeFilter = z.infer<typeof RecipeFilterSchema>;

// --- Nutri-Score ---

export const NutriScoreDetailSchema = z.object({
  negative_points: z.number(),
  positive_points: z.number(),
  total_points: z.number(),
  nutri_class: z.number(),
  nutri_label: z.string(),
  details: z.record(z.unknown()).default({}),
});
export type NutriScoreDetail = z.infer<typeof NutriScoreDetailSchema>;

// --- Choices (mirrors backend recipe/choices.py) ---

export const RECIPE_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Frühstück', icon: 'free_breakfast' },
  { value: 'warm_meal', label: 'Warme Mahlzeit', icon: 'lunch_dining' },
  { value: 'cold_meal', label: 'Kalte Mahlzeit', icon: 'takeout_dining' },
  { value: 'dessert', label: 'Nachtisch', icon: 'cake' },
  { value: 'recipe_part', label: 'Rezeptteil', icon: 'dining' },
  { value: 'drink', label: 'Getränk', icon: 'local_cafe' },
  { value: 'snack', label: 'Snack', icon: 'cookie' },
  { value: 'ingredient', label: 'Zutat', icon: 'grocery' },
] as const;

export const RECIPE_DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Einfach' },
  { value: 'medium', label: 'Mittel' },
  { value: 'hard', label: 'Schwer' },
] as const;

export const RECIPE_EXECUTION_TIME_OPTIONS = [
  { value: 'less_30', label: '< 30 Min' },
  { value: '30_60', label: '30 – 60 Min' },
  { value: '60_90', label: '60 – 90 Min' },
  { value: 'more_90', label: '> 90 Min' },
] as const;

export const RECIPE_PREPARATION_TIME_OPTIONS = [
  { value: 'none', label: 'keine' },
  { value: 'less_15', label: '< 15 Min' },
  { value: '15_30', label: '15 – 30 Min' },
  { value: '30_60', label: '30 – 60 Min' },
  { value: 'more_60', label: '> 60 Min' },
] as const;

export const RECIPE_ORIGIN_OPTIONS = [
  { value: 'all', label: 'Alle', icon: 'public' },
  { value: 'verified', label: 'Inspi-verifiziert', icon: 'verified' },
  { value: 'community', label: 'Community', icon: 'groups' },
  { value: 'mine', label: 'Meine Rezepte', icon: 'person' },
] as const;

export const RECIPE_SORT_OPTIONS = [
  { value: 'newest', label: 'Neueste' },
  { value: 'oldest', label: 'Älteste' },
  { value: 'most_liked', label: 'Beliebteste' },
  { value: 'popular', label: 'Meistgesehen' },
  { value: 'random', label: 'Zufällig' },
] as const;

export const RECIPE_EMOTION_OPTIONS = [
  { value: 'in_love', label: 'Begeistert', emoji: '😍' },
  { value: 'happy', label: 'Gut', emoji: '😊' },
  { value: 'disappointed', label: 'Enttäuscht', emoji: '😞' },
  { value: 'complex', label: 'Zu komplex', emoji: '🤯' },
] as const;

// --- Recipe Improvements (ranked, merged Nutri-Score + RecipeHint) ---

export const SuggestedIngredientSchema = z.object({
  id: z.number(),
  name: z.string(),
  contribution_g: z.number(),
  unit: z.string(),
});
export type SuggestedIngredient = z.infer<typeof SuggestedIngredientSchema>;

export const ImprovementSchema = z.object({
  parameter: z.string(),
  parameter_label: z.string(),
  current_value: z.number(),
  threshold_value: z.number(),
  delta: z.number(),
  unit: z.string(),
  direction: z.string(), // "reduce" | "increase"
  impact_score: z.number(),
  suggested_ingredients: z.array(SuggestedIngredientSchema),
  source: z.string(), // "nutri_score" | "recipe_hint" | "merged"
  recommendation_text: z.string(),
});
export type Improvement = z.infer<typeof ImprovementSchema>;

export const ImprovementListSchema = z.object({
  items: z.array(ImprovementSchema),
  all_good: z.boolean(),
  is_applicable: z.boolean().default(true),
  message: z.string().default(''),
});
export type ImprovementList = z.infer<typeof ImprovementListSchema>;

// --- LLM Suggestion ---

export const LlmSuggestionSchema = z.object({
  ingredient_name: z.string(),
  recommended_amount: z.number(),
  unit: z.string(),
  reasoning: z.string(),
  expected_improvement: z.string(),
});
export type LlmSuggestion = z.infer<typeof LlmSuggestionSchema>;

// --- Nutrition Breakdown ---

export const ContributionSchema = z.object({
  parameter: z.string(), // energy, protein, fat, sat_fat, carbs, sugar, salt, fiber
  absolute: z.number(),
  percent_of_recipe: z.number(), // 0–100
});
export type Contribution = z.infer<typeof ContributionSchema>;

export const RecipeItemNutritionSchema = z.object({
  recipe_item_id: z.number(),
  ingredient_id: z.number().nullable(),
  ingredient_name: z.string(),
  quantity: z.number(),
  portion_name: z.string(),
  weight_g: z.number(),
  price_eur: z.number().nullable(),
  energy_kcal: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  fat_sat_g: z.number(),
  carbohydrate_g: z.number(),
  sugar_g: z.number(),
  fibre_g: z.number(),
  salt_g: z.number(),
  weight_pct: z.number(),
  // Vitamins
  vitamin_c_mg: z.number().nullable().optional(),
  // Per-item contributions to nutritional parameters
  contributions: z.array(ContributionSchema).default([]),
});
export type RecipeItemNutrition = z.infer<typeof RecipeItemNutritionSchema>;

export const RecipeNutritionBreakdownSchema = z.object({
  total_weight_g: z.number(),
  total_price_eur: z.number().nullable(),
  total_energy_kcal: z.number(),
  total_protein_g: z.number(),
  total_fat_g: z.number(),
  total_fat_sat_g: z.number(),
  total_carbohydrate_g: z.number(),
  total_sugar_g: z.number(),
  total_fibre_g: z.number(),
  total_salt_g: z.number(),
  // Micronutrient totals
  total_vitamin_c_mg: z.number().nullable().optional(),
  // Per-serving values
  per_serving_energy_kcal: z.number().nullable(),
  per_serving_protein_g: z.number().nullable(),
  per_serving_fat_g: z.number().nullable(),
  per_serving_carbohydrate_g: z.number().nullable(),
  per_serving_vitamin_c_mg: z.number().nullable().optional(),
  // Per-100g values
  per_100g_energy_kcal: z.number().nullable(),
  per_100g_protein_g: z.number().nullable(),
  per_100g_fat_g: z.number().nullable(),
  per_100g_fat_sat_g: z.number().nullable(),
  per_100g_carbohydrate_g: z.number().nullable(),
  per_100g_sugar_g: z.number().nullable(),
  per_100g_fibre_g: z.number().nullable(),
  per_100g_salt_g: z.number().nullable(),
  per_100g_vitamin_c_mg: z.number().nullable().optional(),
  // DGE coverage percentages (nutrient -> %)
  dge_coverage: z.record(z.string(), z.number().nullable()).default({}),
  // DGE reference values (nutrient -> daily reference in g/mg/kJ)
  dge_reference: z.record(z.string(), z.number().nullable()).default({}),
  positive_traits: z.array(z.string()).default([]),
  items: z.array(RecipeItemNutritionSchema),
});
export type RecipeNutritionBreakdown = z.infer<typeof RecipeNutritionBreakdownSchema>;

// --- AI Quantity Estimation ---

export const EstimateQuantityItemSchema = z.object({
  item_id: z.number(),
  ingredient_name: z.string(),
  quantity_per_portion: z.number(),
  unit: z.string(),
});
export type EstimateQuantityItem = z.infer<typeof EstimateQuantityItemSchema>;

export const EstimateQuantitiesSchema = z.object({
  items: z.array(EstimateQuantityItemSchema),
});
export type EstimateQuantities = z.infer<typeof EstimateQuantitiesSchema>;

// --- Unified Recipe Rules (scope=recipe) ---

export const RecipeRuleResultSchema = z.object({
  rule_id: z.number(),
  name: z.string(),
  parameter: z.string(),
  status: z.enum(['green', 'yellow', 'red']),
  value_per_serving: z.number(),
  display_value: z.string().nullable().optional(),
  unit: z.string(),
  threshold: z.number().nullable().optional(),
  threshold_direction: z.enum(['min', 'max']).nullable().optional(),
  tip_text: z.string(),
});
export type RecipeRuleResult = z.infer<typeof RecipeRuleResultSchema>;

export const RecipeRulesSchema = z.object({
  green_count: z.number(),
  yellow_count: z.number(),
  red_count: z.number(),
  items: z.array(RecipeRuleResultSchema),
  is_applicable: z.boolean().default(true),
  message: z.string().default(''),
});
export type RecipeRules = z.infer<typeof RecipeRulesSchema>;

// --- Recipe Type Stats (Kategorie-Benchmarking) ---

// Bucket for histogram display
export const BucketSchema = z.object({
  min: z.number(),
  max: z.number(),
  count: z.number(),
});
export type Bucket = z.infer<typeof BucketSchema>;

export const RecipeTypeStatsSchema = z.object({
  recipe_type: z.string(),
  count: z.number(),
  price_min: z.number().nullable(),
  price_max: z.number().nullable(),
  price_avg: z.number().nullable(),
  price_median: z.number().nullable(),
  energy_min: z.number().nullable(),
  energy_max: z.number().nullable(),
  energy_avg: z.number().nullable(),
  energy_median: z.number().nullable(),
  protein_avg: z.number().nullable(),
  fat_avg: z.number().nullable(),
  carbs_avg: z.number().nullable(),
  weight_min: z.number().nullable(),
  weight_max: z.number().nullable(),
  weight_avg: z.number().nullable(),
  weight_median: z.number().nullable(),
  nutri_score_dist: z.record(z.string(), z.number()).default({}),
  price_buckets: z.array(BucketSchema).default([]),
  energy_buckets: z.array(BucketSchema).default([]),
  protein_buckets: z.array(BucketSchema).default([]),
  updated_at: z.string(),
});
export type RecipeTypeStats = z.infer<typeof RecipeTypeStatsSchema>;
