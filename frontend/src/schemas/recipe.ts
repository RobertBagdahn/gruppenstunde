/**
 * Zod schemas for Recipe API.
 * MUST stay in sync with backend/recipe/schemas.py
 */
import { z } from 'zod';
import { TagSchema, ScoutLevelSchema, NutritionalTagSchema } from './idea';

// --- Author ---

export const RecipeAuthorSchema = z.object({
  id: z.number().nullable().default(null),
  display_name: z.string(),
  scout_name: z.string().default(''),
  profile_picture_url: z.string().nullable().default(null),
  is_registered: z.boolean().default(false),
});
export type RecipeAuthor = z.infer<typeof RecipeAuthorSchema>;

// --- RecipeItem ---

export const RecipeItemSchema = z.object({
  id: z.number(),
  portion_id: z.number().nullable(),
  portion_name: z.string().nullable().optional(),
  ingredient_id: z.number().nullable(),
  ingredient_name: z.string().nullable().optional(),
  quantity: z.number(),
  measuring_unit_id: z.number().nullable(),
  measuring_unit_name: z.string().nullable().optional(),
  sort_order: z.number(),
  note: z.string(),
  quantity_type: z.string(),
});
export type RecipeItem = z.infer<typeof RecipeItemSchema>;

// --- Recipe List Item ---

export const RecipeListItemSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  recipe_type: z.string(),
  summary: z.string(),
  costs_rating: z.string(),
  execution_time: z.string(),
  difficulty: z.string(),
  image_url: z.string().nullable(),
  like_score: z.number(),
  view_count: z.number(),
  servings: z.number().nullable(),
  created_at: z.string(),
  scout_levels: z.array(ScoutLevelSchema),
  tags: z.array(TagSchema),
});
export type RecipeListItem = z.infer<typeof RecipeListItemSchema>;

// --- Recipe Similar ---

export const RecipeSimilarSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  image_url: z.string().nullable(),
  difficulty: z.string(),
  execution_time: z.string(),
});
export type RecipeSimilar = z.infer<typeof RecipeSimilarSchema>;

// --- Recipe Detail ---

export const RecipeDetailSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  recipe_type: z.string(),
  summary: z.string(),
  summary_long: z.string(),
  description: z.string(),
  costs_rating: z.string(),
  execution_time: z.string(),
  preparation_time: z.string(),
  difficulty: z.string(),
  status: z.string(),
  image_url: z.string().nullable(),
  like_score: z.number(),
  view_count: z.number(),
  servings: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  scout_levels: z.array(ScoutLevelSchema),
  tags: z.array(TagSchema),
  nutritional_tags: z.array(NutritionalTagSchema).default([]),
  recipe_items: z.array(RecipeItemSchema).default([]),
  authors: z.array(RecipeAuthorSchema).default([]),
  emotion_counts: z.record(z.string(), z.number()).default({}),
  user_emotion: z.string().nullable().default(null),
  can_edit: z.boolean().default(false),
  next_best_recipes: z.array(RecipeSimilarSchema).default([]),
});
export type RecipeDetail = z.infer<typeof RecipeDetailSchema>;

// --- Pagination ---

export const PaginatedRecipesSchema = z.object({
  items: z.array(RecipeListItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedRecipes = z.infer<typeof PaginatedRecipesSchema>;

// --- Comment ---

export const RecipeCommentSchema = z.object({
  id: z.number(),
  text: z.string(),
  author_name: z.string(),
  user_id: z.number().nullable(),
  created_at: z.string(),
  parent_id: z.number().nullable(),
  status: z.string(),
});
export type RecipeComment = z.infer<typeof RecipeCommentSchema>;

// --- Emotion ---

export const RecipeEmotionSchema = z.object({
  id: z.number(),
  emotion_type: z.string(),
  created_at: z.string(),
});
export type RecipeEmotion = z.infer<typeof RecipeEmotionSchema>;

// --- Filter ---

export const RecipeFilterSchema = z.object({
  q: z.string().optional(),
  recipe_type: z.string().optional(),
  scout_level_ids: z.array(z.number()).optional(),
  tag_slugs: z.array(z.string()).optional(),
  difficulty: z.string().optional(),
  costs_rating: z.string().optional(),
  execution_time: z.string().optional(),
  sort: z.string().default('newest'),
  page: z.number().default(1),
  page_size: z.number().default(20),
});
export type RecipeFilter = z.infer<typeof RecipeFilterSchema>;

// --- Recipe Hint ---

export const RecipeHintSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  parameter: z.string(),
  min_value: z.number().nullable(),
  max_value: z.number().nullable(),
  min_max: z.string(),
  hint_level: z.string(),
  recipe_type: z.string(),
  recipe_objective: z.string(),
});
export type RecipeHint = z.infer<typeof RecipeHintSchema>;

export const RecipeHintMatchSchema = z.object({
  hint: RecipeHintSchema,
  actual_value: z.number(),
  message: z.string(),
});
export type RecipeHintMatch = z.infer<typeof RecipeHintMatchSchema>;

// --- Recipe Check ---

export const RecipeCheckSchema = z.object({
  label: z.string(),
  value: z.string(),
  color: z.string(),
  score: z.number(),
});
export type RecipeCheck = z.infer<typeof RecipeCheckSchema>;

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
  { value: 'side_dish', label: 'Beilage', icon: 'rice_bowl' },
  { value: 'snack', label: 'Snack', icon: 'cookie' },
  { value: 'drink', label: 'Getränk', icon: 'local_cafe' },
] as const;

export const RECIPE_DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Einfach' },
  { value: 'medium', label: 'Mittel' },
  { value: 'hard', label: 'Schwer' },
] as const;

export const RECIPE_COSTS_OPTIONS = [
  { value: 'free', label: '0 €' },
  { value: 'less_1', label: '< 1 €' },
  { value: '1_2', label: '1 – 2 €' },
  { value: 'more_2', label: '> 2 €' },
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

export const RECIPE_SORT_OPTIONS = [
  { value: 'newest', label: 'Neueste' },
  { value: 'oldest', label: 'Älteste' },
  { value: 'most_liked', label: 'Beliebteste' },
  { value: 'most_viewed', label: 'Meistgesehen' },
  { value: 'random', label: 'Zufällig' },
] as const;

export const RECIPE_EMOTION_OPTIONS = [
  { value: 'in_love', label: 'Begeistert', emoji: '😍' },
  { value: 'happy', label: 'Gut', emoji: '😊' },
  { value: 'disappointed', label: 'Enttäuscht', emoji: '😞' },
  { value: 'complex', label: 'Zu komplex', emoji: '🤯' },
] as const;

// --- Nutrition Breakdown ---

export const RecipeItemNutritionSchema = z.object({
  recipe_item_id: z.number(),
  ingredient_id: z.number().nullable(),
  ingredient_name: z.string(),
  quantity: z.number(),
  portion_name: z.string(),
  weight_g: z.number(),
  price_eur: z.number().nullable(),
  energy_kj: z.number(),
  energy_kcal: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  fat_sat_g: z.number(),
  carbohydrate_g: z.number(),
  sugar_g: z.number(),
  fibre_g: z.number(),
  salt_g: z.number(),
  weight_pct: z.number(),
});
export type RecipeItemNutrition = z.infer<typeof RecipeItemNutritionSchema>;

export const RecipeNutritionBreakdownSchema = z.object({
  total_weight_g: z.number(),
  total_price_eur: z.number().nullable(),
  total_energy_kj: z.number(),
  total_energy_kcal: z.number(),
  total_protein_g: z.number(),
  total_fat_g: z.number(),
  total_fat_sat_g: z.number(),
  total_carbohydrate_g: z.number(),
  total_sugar_g: z.number(),
  total_fibre_g: z.number(),
  total_salt_g: z.number(),
  per_serving_energy_kcal: z.number().nullable(),
  per_serving_protein_g: z.number().nullable(),
  per_serving_fat_g: z.number().nullable(),
  per_serving_carbohydrate_g: z.number().nullable(),
  items: z.array(RecipeItemNutritionSchema),
});
export type RecipeNutritionBreakdown = z.infer<typeof RecipeNutritionBreakdownSchema>;
