/**
 * Zod schemas for Supply (Material, Ingredient, Portion, etc.).
 * MUST stay in sync with backend/supply/schemas.py
 *
 * This file contains all supply-related schemas. The `ingredient.ts` schema
 * file re-exports from here for backward compatibility.
 */
import { z } from 'zod';

// --- Material Category Options ---

export const MATERIAL_CATEGORY_OPTIONS = [
  { value: 'tools', label: 'Werkzeuge' },
  { value: 'crafting', label: 'Bastelmaterial' },
  { value: 'kitchen', label: 'Küchenbedarf' },
  { value: 'outdoor', label: 'Outdoor-Ausrüstung' },
  { value: 'stationery', label: 'Schreibwaren' },
  { value: 'other', label: 'Sonstiges' },
] as const;

// --- Material schemas ---

export const MaterialSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  material_category: z.string(),
  is_consumable: z.boolean(),
  image_url: z.string().nullable(),
  purchase_links: z.array(z.unknown()).default([]),
  created_at: z.string(),
});
export type Material = z.infer<typeof MaterialSchema>;

export const MaterialListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  material_category: z.string(),
  is_consumable: z.boolean(),
});
export type MaterialListItem = z.infer<typeof MaterialListItemSchema>;

// --- ContentMaterialItem (material assigned to content) ---

export const ContentMaterialItemSchema = z.object({
  id: z.number(),
  material_id: z.number(),
  material_name: z.string(),
  material_slug: z.string(),
  material_category: z.string(),
  quantity: z.string(),
  sort_order: z.number(),
});
export type ContentMaterialItem = z.infer<typeof ContentMaterialItemSchema>;

// --- Paginated material response ---

export const PaginatedMaterialsSchema = z.object({
  items: z.array(MaterialSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedMaterials = z.infer<typeof PaginatedMaterialsSchema>;

// ---------------------------------------------------------------------------
// MeasuringUnit
// ---------------------------------------------------------------------------

export const MeasuringUnitSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
});
export type MeasuringUnit = z.infer<typeof MeasuringUnitSchema>;

// ---------------------------------------------------------------------------
// NutritionalTag
// ---------------------------------------------------------------------------

export const NutritionalTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  name_opposite: z.string(),
  description: z.string(),
  rank: z.number(),
  is_dangerous: z.boolean(),
});
export type NutritionalTag = z.infer<typeof NutritionalTagSchema>;

export const NutritionalTagInSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  name_opposite: z.string(),
  description: z.string(),
  rank: z.number(),
  is_dangerous: z.boolean(),
});
export type NutritionalTagIn = z.infer<typeof NutritionalTagInSchema>;

// ---------------------------------------------------------------------------
// RetailSection
// ---------------------------------------------------------------------------

export const RetailSectionSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  rank: z.number(),
});
export type RetailSection = z.infer<typeof RetailSectionSchema>;

export const RetailSectionInSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string(),
  rank: z.number(),
});
export type RetailSectionIn = z.infer<typeof RetailSectionInSchema>;

// ---------------------------------------------------------------------------
// Ingredient Alias
// ---------------------------------------------------------------------------

export const IngredientAliasSchema = z.object({
  id: z.number(),
  name: z.string(),
  rank: z.number(),
});
export type IngredientAlias = z.infer<typeof IngredientAliasSchema>;

// ---------------------------------------------------------------------------
// Portion
// ---------------------------------------------------------------------------

export const PortionSchema = z.object({
  id: z.number(),
  name: z.string(),
  quantity: z.number(),
  weight_g: z.number().nullable(),
  rank: z.number(),
  priority: z.number(),
  is_default: z.boolean(),
  measuring_unit_id: z.number().nullable(),
  measuring_unit_name: z.string().nullable(),
});
export type Portion = z.infer<typeof PortionSchema>;

// ---------------------------------------------------------------------------
// Ingredient (List / Detail)
// ---------------------------------------------------------------------------

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

  // Vitamins
  vitamin_a_mg: z.number().nullable().optional(),
  vitamin_b1_mg: z.number().nullable().optional(),
  vitamin_b2_mg: z.number().nullable().optional(),
  vitamin_b6_mg: z.number().nullable().optional(),
  vitamin_b12_ug: z.number().nullable().optional(),
  vitamin_c_mg: z.number().nullable().optional(),
  vitamin_d_ug: z.number().nullable().optional(),
  vitamin_e_mg: z.number().nullable().optional(),
  vitamin_k_ug: z.number().nullable().optional(),
  niacin_mg: z.number().nullable().optional(),
  folate_ug: z.number().nullable().optional(),
  pantothenic_acid_mg: z.number().nullable().optional(),
  biotin_ug: z.number().nullable().optional(),

  // Minerals
  calcium_mg: z.number().nullable().optional(),
  iron_mg: z.number().nullable().optional(),
  magnesium_mg: z.number().nullable().optional(),
  zinc_mg: z.number().nullable().optional(),
  potassium_mg: z.number().nullable().optional(),
  phosphorus_mg: z.number().nullable().optional(),
  iodine_ug: z.number().nullable().optional(),
  selenium_ug: z.number().nullable().optional(),
  copper_mg: z.number().nullable().optional(),
  manganese_mg: z.number().nullable().optional(),
  chromium_ug: z.number().nullable().optional(),
  fluoride_mg: z.number().nullable().optional(),

  // Calculated
  nutri_score: z.number().nullable(),
  nutri_class: z.number().nullable(),
  price_per_kg: z.number().nullable(),

  // References
  fdc_id: z.number().nullable(),
  nan_art_id_rewe: z.number().nullable(),
  ean: z.string(),

  // Relations
  retail_section_id: z.number().nullable(),
  retail_section_name: z.string().nullable(),
  nutritional_tags: z.array(NutritionalTagSchema),
  portions: z.array(PortionSchema),
  aliases: z.array(IngredientAliasSchema),

  created_at: z.string(),
  updated_at: z.string(),
  created_by_id: z.number().nullable(),
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

// ---------------------------------------------------------------------------
// Recipe analysis schemas (used by both ingredient and recipe APIs)
// ---------------------------------------------------------------------------

export const RecipeHintSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  improvement_text: z.string(),
  hint: z.string(),
  parameter: z.string(),
  value: z.number(),
  min_max: z.string(),
  hint_level: z.string(),
  recipe_type: z.string(),
  recipe_objective: z.string(),
});
export type RecipeHint = z.infer<typeof RecipeHintSchema>;

export const RecipeHintInSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string(),
  improvement_text: z.string(),
  hint: z.string(),
  parameter: z.string().min(1, 'Parameter ist erforderlich'),
  value: z.number(),
  min_max: z.string().min(1, 'Regeltyp ist erforderlich'),
  hint_level: z.string(),
  recipe_type: z.string(),
  recipe_objective: z.string(),
});
export type RecipeHintIn = z.infer<typeof RecipeHintInSchema>;

export const RecipeHintMatchSchema = z.object({
  hint: RecipeHintSchema,
  actual_value: z.number(),
  message: z.string(),
  improvement_text: z.string().default(''),
});
export type RecipeHintMatch = z.infer<typeof RecipeHintMatchSchema>;

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

// --- Legacy Material Content schemas (used by api/materials.ts) ---

export const MaterialContentSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  image_url: z.string().nullable().optional(),
  content_type: z.string().optional(),
});
export type MaterialContent = z.infer<typeof MaterialContentSchema>;

export const MaterialNameDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  default_unit: z.string().nullable(),
  contents: z.array(MaterialContentSchema),
});
export type MaterialNameDetail = z.infer<typeof MaterialNameDetailSchema>;

export const MaterialNameListSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  default_unit: z.string().nullable(),
});
export type MaterialNameList = z.infer<typeof MaterialNameListSchema>;

export const MaterialUnitSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().default(''),
  quantity: z.number().default(1),
  unit: z.string().default(''),
});
export type MaterialUnit2 = z.infer<typeof MaterialUnitSchema>;

export const PaginatedMaterialNamesSchema = z.object({
  items: z.array(MaterialNameListSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedMaterialNames = z.infer<typeof PaginatedMaterialNamesSchema>;

// --- Unit Conversion ---

// --- AI Suggest ---

export const PortionSuggestionSchema = z.object({
  name: z.string(),
  weight_g: z.number(),
});
export type PortionSuggestion = z.infer<typeof PortionSuggestionSchema>;

export const IngredientSuggestAllSchema = z.object({
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

  nutri_score: z.string().nullable(),
  nova_score: z.number().nullable(),
  child_score: z.number().nullable(),
  scout_score: z.number().nullable(),
  environmental_score: z.number().nullable(),
  fruit_factor: z.number().nullable(),

  physical_density: z.number().nullable(),
  physical_viscosity: z.string().nullable(),
  durability_in_days: z.number().nullable(),
  max_storage_temperature: z.number().nullable(),

  portions: z.array(PortionSuggestionSchema).default([]),
  aliases: z.array(z.string()).default([]),
});
export type IngredientSuggestAll = z.infer<typeof IngredientSuggestAllSchema>;

// --- Unit Conversion ---

export const UnitConversionSchema = z.object({
  id: z.number(),
  from_unit_id: z.number(),
  from_unit_name: z.string(),
  to_unit_id: z.number(),
  to_unit_name: z.string(),
  factor: z.number(),
  ingredient_id: z.number().nullable(),
  ingredient_name: z.string().nullable(),
});
export type UnitConversion = z.infer<typeof UnitConversionSchema>;

export const UnitConversionResultSchema = z.object({
  result: z.number(),
  factor: z.number(),
  is_ingredient_specific: z.boolean(),
});
export type UnitConversionResult = z.infer<typeof UnitConversionResultSchema>;
