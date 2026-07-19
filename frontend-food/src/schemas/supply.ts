/**
 * Zod schemas for Supply (Material, Ingredient, Portion, etc.).
 * MUST stay in sync with backend/supply/schemas.py
 *
 * This file contains all supply-related schemas. The `ingredient.ts` schema
 * file re-exports from here for backward compatibility.
 */
import { z } from 'zod';

import { TagSchema } from './content';

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
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});
export type Material = z.infer<typeof MaterialSchema>;

export const MaterialListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  material_category: z.string(),
  is_consumable: z.boolean(),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
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
// IngredientGroup
// ---------------------------------------------------------------------------

export const IngredientGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});
export type IngredientGroup = z.infer<typeof IngredientGroupSchema>;

// ---------------------------------------------------------------------------
// Ingredient Alias
// ---------------------------------------------------------------------------

export const IngredientAliasSchema = z.object({
  id: z.number(),
  name: z.string(),
  rank: z.number(),
  is_generic: z.boolean().default(false),
});
export type IngredientAlias = z.infer<typeof IngredientAliasSchema>;

// ---------------------------------------------------------------------------
// Portion
// ---------------------------------------------------------------------------

export const PortionSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Name ist erforderlich'),
  quantity: z.number(),
  weight_g: z.number().nullable(),
  rank: z.number(),
  is_default: z.boolean(),
  measuring_unit_id: z.number().nullable(),
  measuring_unit_name: z.string().nullable(),
});
export type Portion = z.infer<typeof PortionSchema>;

export const PackageSchema = z.object({
  id: z.number(),
  name: z.string().min(1, 'Name ist erforderlich'),
  weight_g: z.number().nullable(),
  rank: z.number(),
});
export type Package = z.infer<typeof PackageSchema>;

// ---------------------------------------------------------------------------
// Ingredient (List / Detail)
// ---------------------------------------------------------------------------

export const IngredientListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  status: z.string(),
  energy_kcal: z.number().nullable(),
  protein_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  carbohydrate_g: z.number().nullable(),
  nutri_class: z.number().nullable(),
  price_per_kg: z.number().nullable(),
  retail_section_id: z.number().nullable(),
  retail_section_name: z.string().nullable(),
  quality_score: z.number().int().nullable().optional(),
  usage_count: z.number().int(),
  groups: z.array(IngredientGroupSchema),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});
export type IngredientListItem = z.infer<typeof IngredientListItemSchema>;

export const IngredientDetailSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  status: z.string(),
  name_warning: z.string().nullable().optional(),

  // Physical
  physical_density: z.number(),
  physical_viscosity: z.string(),
  durability_in_days: z.number().nullable(),
  max_storage_temperature: z.number().nullable(),

  // Scout/camp fields
  storage_type: z.string().nullable().optional(),
  cooking_factor: z.number().nullable().optional(),
  camp_suitable: z.boolean().default(false),
  preparation_time_min: z.number().nullable().optional(),
  season_start: z.number().nullable().optional(),
  season_end: z.number().nullable().optional(),

  // Nutritional values per 100g
  energy_kcal: z.number().nullable(),
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

  // Vitamins (only vitamin_c_mg is stored/returned by the backend)
  vitamin_c_mg: z.number().nullable().optional(),

  // Standalone food
  is_standalone_food: z.boolean().default(false),
  ingredient_ref_id: z.number().nullable().optional(),

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
  packages: z.array(PackageSchema).default([]),
  tags: z.array(TagSchema).default([]),
  aliases: z.array(IngredientAliasSchema),
  groups: z.array(IngredientGroupSchema),

  created_at: z.string(),
  updated_at: z.string(),
  created_by_id: z.number().nullable(),
  quality_score: z.number().int().nullable().optional(),
  quality_score_updated_at: z.string().nullable().optional(),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
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

export const NUTRI_SCORE_COLORS_BY_LETTER: Record<string, { bg: string; text: string }> = {
  A: { bg: 'bg-green-600', text: 'text-white' },
  B: { bg: 'bg-lime-500', text: 'text-white' },
  C: { bg: 'bg-yellow-400', text: 'text-yellow-900' },
  D: { bg: 'bg-orange-500', text: 'text-white' },
  E: { bg: 'bg-red-600', text: 'text-white' },
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

export const PortionTypeSchema = z.enum(['rezeptportion', 'packung', 'belag', 'backmenge']);
export type PortionType = z.infer<typeof PortionTypeSchema>;

export const PortionSuggestionSchema = z.object({
  name: z.string(),
  weight_g: z.number(),
  quantity: z.number().default(1),
  measuring_unit_name: z.string(),
  rank: z.number().int().default(1),
  portion_type: PortionTypeSchema,
});
export type PortionSuggestion = z.infer<typeof PortionSuggestionSchema>;

export const PackageSuggestionSchema = z.object({
  name: z.string(),
  weight_g: z.number(),
  rank: z.number().int().default(1),
  package_type: z.string().default('packung'),
});
export type PackageSuggestion = z.infer<typeof PackageSuggestionSchema>;

export const IngredientAiSuggestSchema = z.object({
  portions: z.array(PortionSuggestionSchema).default([]),
  packages: z.array(PackageSuggestionSchema).default([]),
});
export type IngredientAiSuggest = z.infer<typeof IngredientAiSuggestSchema>;

// Request-Body für POST /{slug}/ai-apply/
export const AiApplyInSchema = z.object({
  replace_all: z.boolean().default(false),
  portions: z.array(PortionSuggestionSchema).default([]),
  packages: z.array(PackageSuggestionSchema).default([]),
});
export type AiApplyIn = z.infer<typeof AiApplyInSchema>;

export const IngredientSuggestAllSchema = z.object({
  ai_interaction_id: z.string().nullable().optional(),
  name_suggestion: z.string().nullable(),

  description: z.string().nullable(),

  energy_kcal: z.number().nullable(),
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

  nutri_score: z.number().nullable(),
  nova_score: z.number().nullable(),
  child_score: z.number().nullable(),
  scout_score: z.number().nullable(),
  environmental_score: z.number().nullable(),
  fruit_factor: z.number().nullable(),

  physical_density: z.number().nullable(),
  physical_viscosity: z.string().nullable(),
  durability_in_days: z.number().nullable(),
  max_storage_temperature: z.number().nullable(),

  storage_type: z.string().nullable(),
  cooking_factor: z.number().nullable(),
  camp_suitable: z.boolean().nullable(),
  preparation_time_min: z.number().nullable(),
  season_start: z.number().nullable(),
  season_end: z.number().nullable(),

  price_per_kg: z.number().nullable(),

  ai_suggest: IngredientAiSuggestSchema,
  aliases: z.array(z.string()).default([]),
  nutritional_tags: z.array(NutritionalTagSchema).default([]),
});
export type IngredientSuggestAll = z.infer<typeof IngredientSuggestAllSchema>;

// --- Ingredient Similar ---

export const IngredientSimilarSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  distance: z.number(),
});
export type IngredientSimilar = z.infer<typeof IngredientSimilarSchema>;

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

// --- Available Conversions ---

export const AvailableConversionItemSchema = z.object({
  to_unit_id: z.number(),
  to_unit_name: z.string(),
  quantity: z.number(),
  is_ingredient_specific: z.boolean(),
});
export type AvailableConversionItem = z.infer<typeof AvailableConversionItemSchema>;

export const AvailableConversionsSchema = z.object({
  from_unit_id: z.number(),
  from_unit_name: z.string(),
  original_quantity: z.number(),
  conversions: z.array(AvailableConversionItemSchema),
});
export type AvailableConversions = z.infer<typeof AvailableConversionsSchema>;

export const AvailableConversionBatchRequestItemSchema = z.object({
  ingredient_id: z.number(),
  from_unit_id: z.number(),
  quantity: z.number(),
});
export type AvailableConversionBatchRequestItem = z.infer<typeof AvailableConversionBatchRequestItemSchema>;

export const AvailableConversionBatchItemSchema = z.object({
  ingredient_id: z.number(),
  from_unit_id: z.number(),
  from_unit_name: z.string(),
  original_quantity: z.number(),
  conversions: z.array(AvailableConversionItemSchema),
});
export type AvailableConversionBatchItem = z.infer<typeof AvailableConversionBatchItemSchema>;

export const AvailableConversionBatchSchema = z.object({
  items: z.array(AvailableConversionBatchItemSchema),
});
export type AvailableConversionBatch = z.infer<typeof AvailableConversionBatchSchema>;

// ==========================================================================
// Statistics types (for Ingredient Statistics tabs)
// ==========================================================================

export const RankingItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  value: z.number(),
  nutri_class: z.number().nullable(),
  retail_section_name: z.string().nullable(),
});
export type RankingItem = z.infer<typeof RankingItemSchema>;

export const RankingsOutSchema = z.object({
  top: z.array(RankingItemSchema),
  bottom: z.array(RankingItemSchema),
  count: z.number(),
});
export type RankingsOut = z.infer<typeof RankingsOutSchema>;

export const DistributionBucketSchema = z.object({
  min: z.number(),
  max: z.number().nullable(),
  count: z.number(),
  percentage: z.number(),
  label: z.string(),
});
export type DistributionBucket = z.infer<typeof DistributionBucketSchema>;

export const DistributionStatsSchema = z.object({
  mean: z.number().nullable(),
  median: z.number().nullable(),
  p5: z.number().nullable(),
  p95: z.number().nullable(),
  count: z.number(),
});
export type DistributionStats = z.infer<typeof DistributionStatsSchema>;

export const DistributionOutSchema = z.object({
  buckets: z.array(DistributionBucketSchema),
  stats: DistributionStatsSchema,
});
export type DistributionOut = z.infer<typeof DistributionOutSchema>;

export const ScatterPointSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  x: z.number(),
  y: z.number(),
  nutri_class: z.number().nullable(),
  retail_section_name: z.string().nullable(),
});
export type ScatterPoint = z.infer<typeof ScatterPointSchema>;

export const LinearFitSchema = z.object({
  slope: z.number(),
  intercept: z.number(),
  r_squared: z.number(),
});
export type LinearFit = z.infer<typeof LinearFitSchema>;

export const ScatterOutSchema = z.object({
  points: z.array(ScatterPointSchema),
  pearson_r: z.number().nullable(),
  linear_fit: LinearFitSchema.nullable(),
  count: z.number(),
});
export type ScatterOut = z.infer<typeof ScatterOutSchema>;

export const OutlierItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  value: z.number(),
  severity: z.enum(['moderate', 'extreme']),
  deviation: z.number(),
});
export type OutlierItem = z.infer<typeof OutlierItemSchema>;

export const FieldOutliersSchema = z.object({
  field: z.string(),
  field_label: z.string(),
  unit: z.string(),
  count: z.number(),
  items: z.array(OutlierItemSchema),
});
export type FieldOutliers = z.infer<typeof FieldOutliersSchema>;

export const OutliersOutSchema = z.object({
  fields: z.array(FieldOutliersSchema),
  summary: z.string(),
});
export type OutliersOut = z.infer<typeof OutliersOutSchema>;

export const TagListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  energy_kcal: z.number().nullable(),
  protein_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  carbohydrate_g: z.number().nullable(),
  sugar_g: z.number().nullable(),
  fibre_g: z.number().nullable(),
  salt_g: z.number().nullable(),
  price_per_kg: z.string().nullable(),
  nutri_class: z.number().nullable(),
  retail_section_name: z.string().nullable(),
  lactose_g: z.number().nullable(),
});
export type TagListItem = z.infer<typeof TagListItemSchema>;

export const TagListOutSchema = z.object({
  items: z.array(TagListItemSchema),
  total_count: z.number(),
  total_overall: z.number(),
  tag_name: z.string(),
});
export type TagListOut = z.infer<typeof TagListOutSchema>;

export const ScoreClassItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  value: z.number().nullable(),
  nutri_class: z.number().nullable(),
});
export type ScoreClassItem = z.infer<typeof ScoreClassItemSchema>;

export const ScoreClassDataSchema = z.object({
  class_value: z.number(),
  class_label: z.string(),
  count: z.number(),
  percentage: z.number(),
  top: z.array(ScoreClassItemSchema),
  bottom: z.array(ScoreClassItemSchema),
});
export type ScoreClassData = z.infer<typeof ScoreClassDataSchema>;

export const ScoresOutSchema = z.object({
  classes: z.array(ScoreClassDataSchema),
  total_count: z.number(),
});
export type ScoresOut = z.infer<typeof ScoresOutSchema>;

export const ComparisonGroupSchema = z.object({
  label: z.string(),
  count: z.number(),
  mean: z.number().nullable(),
  median: z.number().nullable(),
  p5: z.number().nullable(),
  p95: z.number().nullable(),
  buckets: z.array(DistributionBucketSchema),
});

export const ComparisonOutSchema = z.object({
  group: ComparisonGroupSchema,
  rest: ComparisonGroupSchema,
  mean_difference_pct: z.number().nullable(),
  metric: z.string(),
  metric_unit: z.string(),
  group_label: z.string(),
});
export type ComparisonOut = z.infer<typeof ComparisonOutSchema>;

// ==========================================================================
// Ingredient URL Import — sync with backend IngredientImportUrlIn/Out
// ==========================================================================

export const IngredientImportUrlInSchema = z.object({
  url: z.string().url(),
});
export type IngredientImportUrlIn = z.infer<typeof IngredientImportUrlInSchema>;

export const IngredientDraftSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  retail_section_id: z.number().nullable(),
});
export type IngredientDraft = z.infer<typeof IngredientDraftSchema>;

export const IngredientNutritionDraftSchema = z.object({
  energy_kcal: z.number().nullable(),
  protein_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  fat_sat_g: z.number().nullable(),
  carbohydrate_g: z.number().nullable(),
  sugar_g: z.number().nullable(),
  fibre_g: z.number().nullable(),
  salt_g: z.number().nullable(),
  sodium_mg: z.number().nullable(),
});
export type IngredientNutritionDraft = z.infer<typeof IngredientNutritionDraftSchema>;

export const IngredientImportUrlOutSchema = z.object({
  ai_interaction_id: z.string().nullable().optional(),
  ingredient_draft: IngredientDraftSchema,
  nutrition: IngredientNutritionDraftSchema.nullable(),
});
export type IngredientImportUrlOut = z.infer<typeof IngredientImportUrlOutSchema>;

// ============================================================================
// Equipment
// ============================================================================

export const EquipmentSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  sort_order: z.number(),
});
export type Equipment = z.infer<typeof EquipmentSchema>;

export const EquipmentInSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  sort_order: z.number(),
});
export type EquipmentIn = z.infer<typeof EquipmentInSchema>;

// ============================================================================
// Tag Admin
// ============================================================================

export const TagAdminSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  parent_id: z.string().nullable(),
  parent_name: z.string().nullable(),
  icon: z.string(),
  group: z.string(),
  sort_order: z.number(),
  is_approved: z.boolean(),
});
export type TagAdmin = z.infer<typeof TagAdminSchema>;

export const TagAdminInSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string(),
  parent_id: z.string().nullable(),
  group: z.string(),
  icon: z.string(),
  sort_order: z.number(),
});
export type TagAdminIn = z.infer<typeof TagAdminInSchema>;

export const TagDetailSchema = z.object({
  tag: TagAdminSchema,
  recipes: z.array(z.object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
  })),
  ingredients: z.array(z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
  })),
});
export type TagDetail = z.infer<typeof TagDetailSchema>;
