/**
 * Zod schemas for the Ingredient Database API.
 * MUST stay in sync with backend/idea/schemas.py (ingredient-related schemas)
 */
import { z } from 'zod';

// --- Retail Section ---

export const RetailSectionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  rank: z.number(),
});
export type RetailSection = z.infer<typeof RetailSectionSchema>;

// --- Nutritional Tag ---

export const NutritionalTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  name_opposite: z.string(),
  description: z.string(),
  rank: z.number(),
  is_dangerous: z.boolean(),
});
export type NutritionalTag = z.infer<typeof NutritionalTagSchema>;

// --- Portion ---

export const PortionSchema = z.object({
  id: z.number(),
  name: z.string(),
  quantity: z.number(),
  weight_g: z.number().nullable(),
  rank: z.number(),
  measuring_unit_id: z.number().nullable(),
  measuring_unit_name: z.string().nullable(),
});
export type Portion = z.infer<typeof PortionSchema>;

// --- Price ---

export const PriceSchema = z.object({
  id: z.number(),
  price_eur: z.number(),
  quantity: z.number(),
  name: z.string(),
  retailer: z.string(),
  quality: z.string(),
  portion_id: z.number(),
});
export type Price = z.infer<typeof PriceSchema>;

// --- Ingredient Alias ---

export const IngredientAliasSchema = z.object({
  id: z.number(),
  name: z.string(),
  rank: z.number(),
});
export type IngredientAlias = z.infer<typeof IngredientAliasSchema>;

// --- Ingredient List (compact) ---

export const IngredientListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  status: z.string(),
  energy_kj: z.number().nullable(),
  protein_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  carbohydrate_g: z.number().nullable(),
  nutri_class: z.number().nullable(),
  price_per_kg: z.number().nullable(),
  retail_section_id: z.number().nullable(),
  retail_section_name: z.string().nullable(),
});
export type IngredientListItem = z.infer<typeof IngredientListItemSchema>;

// --- Ingredient Detail ---

export const IngredientDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  status: z.string(),

  // Physical
  physical_density: z.number(),
  physical_viscosity: z.string(),
  durability_in_days: z.number().nullable(),
  max_storage_temperature: z.number().nullable(),

  // Nutritional values per 100g
  energy_kj: z.number().nullable(),
  protein_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  fat_sat_g: z.number().nullable(),
  carbohydrate_g: z.number().nullable(),
  sugar_g: z.number().nullable(),
  fibre_g: z.number().nullable(),
  salt_g: z.number().nullable(),
  sodium_mg: z.number().nullable(),
  fructose_g: z.number().nullable(),
  lactose_g: z.number().nullable(),

  // Scores
  child_score: z.number().nullable(),
  scout_score: z.number().nullable(),
  environmental_score: z.number().nullable(),
  nova_score: z.number().nullable(),
  fruit_factor: z.number().nullable(),

  // Calculated
  nutri_score: z.number().nullable(),
  nutri_class: z.number().nullable(),
  price_per_kg: z.number().nullable(),

  // References
  fdc_id: z.number().nullable(),
  ean: z.string(),

  // Relations
  retail_section_id: z.number().nullable(),
  retail_section_name: z.string().nullable(),
  nutritional_tags: z.array(NutritionalTagSchema),
  portions: z.array(PortionSchema),
  aliases: z.array(IngredientAliasSchema),

  created_at: z.string(),
  updated_at: z.string(),
});
export type IngredientDetail = z.infer<typeof IngredientDetailSchema>;

// --- Paginated Ingredient List ---

export const PaginatedIngredientSchema = z.object({
  items: z.array(IngredientListItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedIngredient = z.infer<typeof PaginatedIngredientSchema>;

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

// --- Recipe Hint Match ---

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

// --- Nutri-Score Detail ---

export const NutriScoreDetailSchema = z.object({
  negative_points: z.number(),
  positive_points: z.number(),
  total_points: z.number(),
  nutri_class: z.number(),
  nutri_label: z.string(),
  details: z.record(z.unknown()),
});
export type NutriScoreDetail = z.infer<typeof NutriScoreDetailSchema>;

// --- Nutri-Score Colors (for UI) ---

export const NUTRI_SCORE_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-green-600', text: 'text-white', label: 'A' },
  2: { bg: 'bg-green-400', text: 'text-white', label: 'B' },
  3: { bg: 'bg-yellow-400', text: 'text-black', label: 'C' },
  4: { bg: 'bg-orange-400', text: 'text-white', label: 'D' },
  5: { bg: 'bg-red-500', text: 'text-white', label: 'E' },
};
