/** Zod schemas for data quality features. MUST stay in sync with backend/content/schemas/data_quality.py */

import { z } from 'zod';

// --- Price Analysis ---

export const PriceAnomalySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  price_per_kg: z.string().nullable().optional(),
  retail_section: z.string().nullable().optional(),
  z_score: z.number().nullable().optional(),
  anomaly_type: z.enum(['high', 'low', 'missing']),
});
export type PriceAnomaly = z.infer<typeof PriceAnomalySchema>;

export const PaginatedPriceAnomalySchema = z.object({
  items: z.array(PriceAnomalySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export const PriceEvaluateRequestSchema = z.object({
  ingredient_ids: z.array(z.number()).min(1, 'Mindestens eine Zutat auswählen'),
});
export type PriceEvaluateRequest = z.infer<typeof PriceEvaluateRequestSchema>;

export const PriceSuggestionSchema = z.object({
  ingredient_id: z.number(),
  current_price: z.string().nullable().optional(),
  suggested_price: z.string().nullable().optional(),
  reasoning: z.string(),
});
export type PriceSuggestion = z.infer<typeof PriceSuggestionSchema>;

export const PriceEvaluateResponseSchema = z.object({
  suggestions: z.array(PriceSuggestionSchema),
  batch_token: z.string(),
});

export const PriceApplyRequestSchema = z.object({
  items: z.array(z.object({ ingredient_id: z.number(), price_per_kg: z.string() })),
});
export type PriceApplyRequest = z.infer<typeof PriceApplyRequestSchema>;

// --- Duplicates ---

export const DuplicatePairSchema = z.object({
  ingredient_a: z.object({ id: z.number(), name: z.string(), slug: z.string() }),
  ingredient_b: z.object({ id: z.number(), name: z.string(), slug: z.string() }),
  similarity: z.number(),
});
export type DuplicatePair = z.infer<typeof DuplicatePairSchema>;

export const PaginatedDuplicatePairSchema = z.object({
  items: z.array(DuplicatePairSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export const MergePreviewSchema = z.object({
  source_id: z.number(),
  source_name: z.string(),
  target_id: z.number(),
  target_name: z.string(),
  affected_recipe_items: z.number(),
  source_aliases: z.array(z.string()),
  target_aliases: z.array(z.string()),
  nutrition_comparison: z.object({
    source: z.object({ energy_kcal: z.number().nullable(), protein_g: z.number().nullable() }),
    target: z.object({ energy_kcal: z.number().nullable(), protein_g: z.number().nullable() }),
  }),
});
export type MergePreview = z.infer<typeof MergePreviewSchema>;

export const RecipeMergePreviewSchema = z.object({
  source_id: z.number(),
  source_name: z.string(),
  target_id: z.number(),
  target_name: z.string(),
  affected_meal_count: z.number(),
});
export type RecipeMergePreview = z.infer<typeof RecipeMergePreviewSchema>;

export const MergeRequestSchema = z.object({
  source_id: z.number(),
  target_id: z.number(),
});
export type MergeRequest = z.infer<typeof MergeRequestSchema>;

export const DismissRequestSchema = z.object({
  ingredient_a_id: z.number(),
  ingredient_b_id: z.number(),
});

export const RecipeDismissRequestSchema = z.object({
  recipe_a_id: z.number(),
  recipe_b_id: z.number(),
});
export type RecipeDismissRequest = z.infer<typeof RecipeDismissRequestSchema>;

// --- Completeness ---

export const CompletenessItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  quality_score: z.number().nullable().optional(),
  status: z.string(),
  nutrition_score: z.number(),
  price_score: z.number(),
  physical_score: z.number(),
  classification_score: z.number(),
  scout_score: z.number(),
  portion_score: z.number(),
});
export type CompletenessItem = z.infer<typeof CompletenessItemSchema>;

export const PaginatedCompletenessSchema = z.object({
  items: z.array(CompletenessItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export const MissingClassificationSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  missing_retail_section: z.boolean(),
  missing_tags: z.boolean(),
});
export type MissingClassification = z.infer<typeof MissingClassificationSchema>;

export const NutritionPlausibilitySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  energy_kcal: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  carbohydrate_g: z.number(),
  macro_sum: z.number(),
  issue: z.string(),
});
export type NutritionPlausibility = z.infer<typeof NutritionPlausibilitySchema>;

export const RecipeMetadataCheckSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  missing_image: z.boolean(),
  missing_tags: z.boolean(),
  missing_summary: z.boolean(),
});
export type RecipeMetadataCheck = z.infer<typeof RecipeMetadataCheckSchema>;

export const CacheStalenessSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  cached_at: z.string().nullable().optional(),
  stale_since: z.string().nullable().optional(),
});
export type CacheStaleness = z.infer<typeof CacheStalenessSchema>;

export const PortionPlausibilitySchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  cached_weight_g: z.number().nullable().optional(),
  issue: z.string(),
});
export type PortionPlausibility = z.infer<typeof PortionPlausibilitySchema>;

// --- Trend ---

export const QualityTrendPointSchema = z.object({ date: z.string(), avg_score: z.number() });
export const QualityTrendSchema = z.object({ points: z.array(QualityTrendPointSchema) });
export type QualityTrend = z.infer<typeof QualityTrendSchema>;

// --- Distribution Charts ---

export const DistributionBucketSchema = z.object({
  min: z.number(),
  max: z.number().nullable().optional(),
  count: z.number(),
  label: z.string(),
});

export const DistributionStatsSchema = z.object({
  mean: z.number().nullable().optional(),
  median: z.number().nullable().optional(),
  p5: z.number().nullable().optional(),
  p95: z.number().nullable().optional(),
  count: z.number(),
});

export const CostDistributionSchema = z.object({
  buckets: z.array(DistributionBucketSchema),
  stats: DistributionStatsSchema,
});

export const EnergyDistributionSchema = z.object({
  buckets: z.array(DistributionBucketSchema),
  stats: DistributionStatsSchema,
  top_dense: z.array(z.object({ id: z.number(), name: z.string(), energy_kcal: z.number() })),
  bottom_dense: z.array(z.object({ id: z.number(), name: z.string(), energy_kcal: z.number() })),
});

export const NutrientScatterItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  energy_kcal: z.number(),
  protein_g: z.number(),
  fat_g: z.number(),
  carbohydrate_g: z.number(),
  is_vegan: z.boolean(),
});
export type NutrientScatterItem = z.infer<typeof NutrientScatterItemSchema>;

export const NutrientDistributionSchema = z.object({
  nutrients: z.array(z.record(z.string(), z.unknown())),
  scatter_data: z.array(NutrientScatterItemSchema),
});

export const NutriScoreClassSchema = z.object({ class_label: z.string(), count: z.number() });
export const NutriScoreDistributionSchema = z.object({ classes: z.array(NutriScoreClassSchema) });

// --- Audit Log ---

export const AuditLogEntrySchema = z.object({
  id: z.number(),
  field_name: z.string(),
  old_value: z.string().nullable().optional(),
  new_value: z.string().nullable().optional(),
  changed_by_name: z.string().nullable().optional(),
  changed_at: z.string(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

export const PaginatedAuditLogSchema = z.object({
  items: z.array(AuditLogEntrySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

// --- Impact ---

export const ImpactSchema = z.object({
  recipe_count: z.number(),
  meal_plan_count: z.number(),
});
export type Impact = z.infer<typeof ImpactSchema>;

// --- Paginated list wrapper (generic for misc dashboard endpoints) ---

export const PaginatedListSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_pages: z.number(),
  });
