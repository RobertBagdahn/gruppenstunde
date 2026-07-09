/**
 * Zod schemas for Breakfast Wizard (meal-planning, catalog, items).
 * MUST stay in sync with backend/supply/api/breakfast_catalog.py and backend/recipe/schemas/recipes.py
 */
import { z } from 'zod';

// --- Visibility & Sharing ---

export const VisibilitySchema = z.enum(['private', 'shared', 'group', 'public']);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const VisibilityInputSchema = z.object({
  visibility: z.enum(['private', 'shared']),
  shared_group_ids: z.array(z.number()).default([]),
});
export type VisibilityInput = z.infer<typeof VisibilityInputSchema>;

export const GroupSchema = z.object({
  id: z.number(),
  name: z.string(),
});
export type Group = z.infer<typeof GroupSchema>;

// --- Ingredient Schemas ---

export const PortionSchema = z.object({
  id: z.number(),
  name: z.string(),
  quantity: z.number(),
  weight_g: z.number().nullable(),
  rank: z.number(),
  is_system: z.boolean().default(false),
  measuring_unit_id: z.number().nullable(),
  measuring_unit_name: z.string().nullable(),
});
export type Portion = z.infer<typeof PortionSchema>;

export const BaseIngredientSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  is_standalone_food: z.boolean().default(true),
  standard_recipe_weight_g: z.number().nullable(),
  energy_kcal: z.number().nullable(),
  price_per_kg: z.number().nullable(),
  portions: z.array(PortionSchema).default([]),
});
export type BaseIngredient = z.infer<typeof BaseIngredientSchema>;

export const ToppingIngredientSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  is_standalone_food: z.boolean().default(true),
  energy_kcal: z.number().nullable(),
  price_per_kg: z.number().nullable(),
  portions: z.array(PortionSchema).default([]),
});
export type ToppingIngredient = z.infer<typeof ToppingIngredientSchema>;

export const FatIngredientSchema = ToppingIngredientSchema;
export type FatIngredient = z.infer<typeof FatIngredientSchema>;

export const DrinkIngredientSchema = ToppingIngredientSchema;
export type DrinkIngredient = z.infer<typeof DrinkIngredientSchema>;

export const ExtraIngredientSchema = ToppingIngredientSchema;
export type ExtraIngredient = z.infer<typeof ExtraIngredientSchema>;

// --- Recipe Schemas (breakfast context) ---

export const DrinkRecipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  recipe_type: z.string(),
  cached_energy_kcal: z.number().nullable(),
});
export type DrinkRecipe = z.infer<typeof DrinkRecipeSchema>;

export const WarmMealRecipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  recipe_type: z.string(),
  cached_energy_kcal: z.number().nullable(),
});
export type WarmMealRecipe = z.infer<typeof WarmMealRecipeSchema>;

// --- Breakfast Catalog (main response) ---

export const BreakfastCatalogSchema = z.object({
  base_ingredients: z.array(BaseIngredientSchema).default([]),
  topping_ingredients: z.array(ToppingIngredientSchema).default([]),
  fat_ingredients: z.array(FatIngredientSchema).default([]),
  extra_ingredients: z.array(ExtraIngredientSchema).default([]),
  drink_ingredients: z.array(DrinkIngredientSchema).default([]),
  drink_recipes: z.array(DrinkRecipeSchema).default([]),
  warm_meal_recipes: z.array(WarmMealRecipeSchema).default([]),
  gram_measuring_unit_id: z.number().nullable(),
  ml_measuring_unit_id: z.number().nullable(),
  scheibe_measuring_unit_id: z.number().nullable(),
  portion_measuring_unit_id: z.number().nullable(),
  tasse_measuring_unit_id: z.number().nullable(),
  schuss_measuring_unit_id: z.number().nullable(),
});
export type BreakfastCatalog = z.infer<typeof BreakfastCatalogSchema>;

// --- Ingredient Creation & Updates (for breakfast wizard) ---

export const IngredientCreateSchema = z.object({
  name: z.string().min(1, 'Name erforderlich'),
  description: z.string().default(''),
  physical_density: z.number().default(1.0),
  physical_viscosity: z.enum(['solid', 'liquid', 'gas']).default('solid'),
  durability_in_days: z.number().nullable().default(null),
  max_storage_temperature: z.number().nullable().default(null),
  energy_kcal: z.number().nullable().default(null),
  protein_g: z.number().nullable().default(null),
  fat_g: z.number().nullable().default(null),
  carbohydrate_g: z.number().nullable().default(null),
  // Breakfast wizard specific
  visibility: z.enum(['private', 'shared']).default('private'),
  shared_group_ids: z.array(z.number()).default([]),
  tag_ids: z.array(z.number()).default([]),
});
export type IngredientCreate = z.infer<typeof IngredientCreateSchema>;

export const IngredientUpdateSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  physical_density: z.number().optional(),
  physical_viscosity: z.enum(['solid', 'liquid', 'gas']).optional(),
  energy_kcal: z.number().nullable().optional(),
  protein_g: z.number().nullable().optional(),
  fat_g: z.number().nullable().optional(),
  carbohydrate_g: z.number().nullable().optional(),
  // Breakfast wizard specific
  visibility: z.enum(['private', 'shared']).optional(),
  shared_group_ids: z.array(z.number()).optional(),
  tag_ids: z.array(z.number()).optional(),
});
export type IngredientUpdate = z.infer<typeof IngredientUpdateSchema>;

// --- Ingredient Detail (with ownership info) ---

export const IngredientDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  status: z.string(),
  owner_id: z.number().nullable(),
  owner_name: z.string().nullable(),
  visibility: z.string().default('private'),
  shared_groups: z.array(GroupSchema).default([]),
  created_by_name: z.string().nullable(),
  energy_kcal: z.number().nullable(),
  protein_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  carbohydrate_g: z.number().nullable(),
  portions: z.array(PortionSchema).default([]),
  is_standalone_food: z.boolean().default(false),
});
export type IngredientDetail = z.infer<typeof IngredientDetailSchema>;

// --- Recipe Creation & Updates (for breakfast wizard) ---

export const RecipeItemCreateSchema = z.object({
  portion_id: z.number(),
  quantity: z.number().default(1),
  sort_order: z.number().default(0),
  note: z.string().default(''),
  is_optional: z.boolean().default(false),
});
export type RecipeItemCreate = z.infer<typeof RecipeItemCreateSchema>;

export const RecipeCreateSchema = z.object({
  title: z.string().min(1, 'Title erforderlich'),
  summary: z.string().default(''),
  summary_long: z.string().default(''),
  description: z.string().default(''),
  recipe_type: z.string().default(''),
  execution_time: z.number().nullable().default(null),
  preparation_time: z.number().nullable().default(null),
  difficulty: z.string().default(''),
  scout_level_ids: z.array(z.number()).default([]),
  tag_ids: z.array(z.number()).default([]),
  nutritional_tag_ids: z.array(z.number()).default([]),
  recipe_items: z.array(RecipeItemCreateSchema).default([]),
  // Breakfast wizard specific
  shared_group_ids: z.array(z.number()).default([]),
  // Bot protection
  website: z.string().default(''),
  form_loaded_at: z.number().default(0),
});
export type RecipeCreate = z.infer<typeof RecipeCreateSchema>;

export const RecipeUpdateSchema = z.object({
  title: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  recipe_type: z.string().optional(),
  execution_time: z.number().nullable().optional(),
  preparation_time: z.number().nullable().optional(),
  difficulty: z.string().optional(),
  scout_level_ids: z.array(z.number()).optional(),
  tag_ids: z.array(z.number()).optional(),
  nutritional_tag_ids: z.array(z.number()).optional(),
  recipe_items: z.array(RecipeItemCreateSchema).optional(),
  // Breakfast wizard specific
  shared_group_ids: z.array(z.number()).optional(),
  status: z.string().optional(),
  source_url: z.string().optional(),
  authors_ids: z.array(z.number()).optional(),
});
export type RecipeUpdate = z.infer<typeof RecipeUpdateSchema>;

// --- Recipe Detail (with ownership info) ---

export const RecipeDetailSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  status: z.string(),
  owner_id: z.number().nullable(),
  owner_name: z.string().nullable(),
  visibility: z.string().default('private'),
  shared_group_ids: z.array(z.number()).default([]),
  shared_groups: z.array(GroupSchema).default([]),
  description: z.string(),
  recipe_type: z.string(),
  portions: z.number(),
  cached_energy_kcal: z.number().nullable(),
  cached_protein_g: z.number().nullable(),
});
export type RecipeDetail = z.infer<typeof RecipeDetailSchema>;
