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
  anomaly_type: z.enum(['high', 'low', 'missing', 'pending']),
  price_source: z.enum(['manual', 'ai_accepted', 'missing']),
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
  proposal_id: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  confidence: z.number().nullable().optional(),
});
export type PriceSuggestion = z.infer<typeof PriceSuggestionSchema>;

export const PriceEvaluateResponseSchema = z.object({
  suggestions: z.array(PriceSuggestionSchema),
  batch_token: z.string(),
});

export const PriceApplyItemSchema = z.object({
  ingredient_id: z.number(),
  action: z.enum(['accept', 'reject']).default('accept'),
  replace: z.boolean().default(false),
});
export type PriceApplyItem = z.infer<typeof PriceApplyItemSchema>;

export const PriceApplyRequestSchema = z.object({
  items: z.array(PriceApplyItemSchema).min(1, 'Mindestens eine Zutat auswählen'),
});
export type PriceApplyRequest = z.infer<typeof PriceApplyRequestSchema>;

export const PriceApplyResultSchema = z.object({
  ingredient_id: z.number(),
  proposal_id: z.number().nullable().optional(),
  status: z.enum(['accepted', 'rejected', 'conflict', 'missing_proposal', 'not_found', 'failed']),
  message: z.string().default(''),
});
export type PriceApplyResult = z.infer<typeof PriceApplyResultSchema>;

export const PriceApplyResponseSchema = z.object({
  results: z.array(PriceApplyResultSchema),
});
export type PriceApplyResponse = z.infer<typeof PriceApplyResponseSchema>;

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

export const MergeResponseSchema = z.object({
  success: z.boolean(),
  affected_recipe_items: z.number(),
  portions_moved: z.number(),
  aliases_added: z.number(),
});
export type MergeResponse = z.infer<typeof MergeResponseSchema>;

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
  price_status: z.enum(['priced', 'pending', 'missing']).default('missing'),
  price_source: z.enum(['manual', 'ai_accepted', 'missing']),
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
  energy_kcal: z.number().nullable().optional(),
  protein_g: z.number().nullable().optional(),
  fat_g: z.number().nullable().optional(),
  carbohydrate_g: z.number().nullable().optional(),
  sugar_g: z.number().nullable().optional(),
  fat_sat_g: z.number().nullable().optional(),
  macro_sum: z.number().nullable().optional(),
  issue: z.string(),
  anomaly_type: z.string().nullable().optional(),
  severity: z.string().optional(),
  missing_fields: z.array(z.string()).optional(),
});
export type NutritionPlausibility = z.infer<typeof NutritionPlausibilitySchema>;

export const PaginatedNutritionPlausibilitySchema = z.object({
  items: z.array(NutritionPlausibilitySchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedNutritionPlausibility = z.infer<typeof PaginatedNutritionPlausibilitySchema>;

export const FilledFieldInfoSchema = z.object({
  field: z.string(),
  label: z.string(),
  value: z.unknown(),
});
export type FilledFieldInfo = z.infer<typeof FilledFieldInfoSchema>;

export const IngredientFillResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  filled_fields: z.array(FilledFieldInfoSchema),
  quality_score: z.number().nullable().optional(),
  message: z.string().nullable().optional(),
});
export type IngredientFillResult = z.infer<typeof IngredientFillResultSchema>;

export const AiFillMissingRequestSchema = z.object({
  ingredient_ids: z.array(z.number()),
});
export type AiFillMissingRequest = z.infer<typeof AiFillMissingRequestSchema>;

export const AiFillMissingBatchSchema = z.object({
  results: z.array(IngredientFillResultSchema),
  total_filled: z.number(),
});
export type AiFillMissingBatch = z.infer<typeof AiFillMissingBatchSchema>;

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

// --- Buffet catalog proposals ---

export const BuffetCandidateSchema = z.object({
  candidate_key: z.string(),
  action: z.enum(['add', 'untag', 'merge_into', 'create']),
  item_kind: z.enum(['ingredient', 'recipe']),
  source_id: z.number().nullable(),
  source_name: z.string(),
  target_id: z.number().nullable().optional(),
  target_name: z.string().nullable().optional(),
  role_slugs: z.array(z.string()),
  retail_section: z.string().nullable().optional(),
  recipe_type: z.string().nullable().optional(),
  is_standalone_food: z.boolean().nullable().optional(),
  similarity: z.number().nullable().optional(),
  candidate_status: z.enum(['available', 'stale', 'already_tagged', 'existing_match']),
  rationale: z.string(),
});
export type BuffetCandidate = z.infer<typeof BuffetCandidateSchema>;

export const PaginatedBuffetCandidateSchema = z.object({
  items: z.array(BuffetCandidateSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedBuffetCandidate = z.infer<typeof PaginatedBuffetCandidateSchema>;

export const BuffetDataQualityIssueSchema = z.object({
  item_kind: z.enum(['ingredient', 'recipe']),
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  role_slugs: z.array(z.string()),
  legacy_breakfast_tag_slugs: z.array(z.string()),
  status: z.string(),
  missing_fields: z.array(z.string()),
  retail_section: z.string().nullable().optional(),
  is_standalone_food: z.boolean().nullable().optional(),
});
export type BuffetDataQualityIssue = z.infer<typeof BuffetDataQualityIssueSchema>;

export const BuffetDataQualityReportSchema = z.object({
  items: z.array(BuffetDataQualityIssueSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
  summary: z.record(z.string(), z.number()),
});
export type BuffetDataQualityReport = z.infer<typeof BuffetDataQualityReportSchema>;

export const BuffetProposalSchema = z.object({
  id: z.number(),
  action: z.enum(['add', 'untag', 'merge_into', 'create']),
  item_kind: z.enum(['ingredient', 'recipe']),
  source_id: z.number().nullable().optional(),
  source_expected_name: z.string(),
  target_id: z.number().nullable().optional(),
  target_expected_name: z.string(),
  role_slugs: z.array(z.string()),
  proposed_data: z.record(z.string(), z.unknown()),
  origin: z.enum(['manual', 'ai', 'mixed']),
  ai_confidence: z.number().nullable().optional(),
  rationale: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  created_by_name: z.string().nullable().optional(),
  reviewed_by_name: z.string().nullable().optional(),
  review_note: z.string(),
  preview_current: z.boolean(),
  preview_result: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string(),
  reviewed_at: z.string().nullable().optional(),
});
export type BuffetProposal = z.infer<typeof BuffetProposalSchema>;

export const PaginatedBuffetProposalSchema = z.object({
  items: z.array(BuffetProposalSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export const BuffetProposalCreateRequestSchema = z.object({
  action: z.enum(['add', 'untag', 'merge_into', 'create']),
  item_kind: z.enum(['ingredient', 'recipe']),
  source_id: z.number().nullable().optional(),
  source_expected_name: z.string().default(''),
  target_id: z.number().nullable().optional(),
  target_expected_name: z.string().default(''),
  role_slugs: z.array(z.string()).default([]),
  proposed_data: z.record(z.string(), z.unknown()).default({}),
  origin: z.enum(['manual', 'ai', 'mixed']).default('manual'),
  ai_confidence: z.number().nullable().optional(),
  rationale: z.string().default(''),
});
export type BuffetProposalCreateRequest = z.infer<typeof BuffetProposalCreateRequestSchema>;

export const BuffetProposalUpdateRequestSchema = z.object({
  source_id: z.number().nullable().optional(),
  source_expected_name: z.string().nullable().optional(),
  target_id: z.number().nullable().optional(),
  target_expected_name: z.string().nullable().optional(),
  role_slugs: z.array(z.string()).nullable().optional(),
  proposed_data: z.record(z.string(), z.unknown()).nullable().optional(),
  rationale: z.string().nullable().optional(),
});
export type BuffetProposalUpdateRequest = z.infer<typeof BuffetProposalUpdateRequestSchema>;

export const BuffetProposalSuggestionRequestSchema = z.object({
  item_kind: z.enum(['ingredient', 'recipe']),
  name: z.string().min(2),
  recipe_type: z.string().nullable().optional(),
  role_slugs: z.array(z.string()).default([]),
});
export type BuffetProposalSuggestionRequest = z.infer<typeof BuffetProposalSuggestionRequestSchema>;

export const BuffetProposalSuggestionSchema = z.object({
  item_kind: z.enum(['ingredient', 'recipe']),
  name: z.string(),
  proposed_data: z.record(z.string(), z.unknown()),
  ai_confidence: z.number().nullable().optional(),
  rationale: z.string(),
  ai_interaction_id: z.string().nullable().optional(),
});
export type BuffetProposalSuggestion = z.infer<typeof BuffetProposalSuggestionSchema>;

export const BuffetProposalPreviewSchema = z.object({
  proposal_id: z.number(),
  fingerprint: z.string(),
  can_approve: z.boolean(),
  blockers: z.array(z.string()),
  warnings: z.array(z.string()),
  plan: z.array(z.record(z.string(), z.unknown())),
  affected_references: z.record(z.string(), z.number()),
  previewed_at: z.string(),
});
export type BuffetProposalPreview = z.infer<typeof BuffetProposalPreviewSchema>;

export const BuffetProposalReviewRequestSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  note: z.string().default(''),
});
export type BuffetProposalReviewRequest = z.infer<typeof BuffetProposalReviewRequestSchema>;

export const BuffetProposalExportSchema = z.object({
  items: z.array(z.object({
    action: z.string(),
    item_kind: z.string(),
    source_id: z.number().nullable().optional(),
    source_name: z.string(),
    target_id: z.number().nullable().optional(),
    target_name: z.string(),
    role_slugs: z.array(z.string()),
    proposed_data: z.record(z.string(), z.unknown()),
  })),
  exported_at: z.string(),
});
export type BuffetProposalExport = z.infer<typeof BuffetProposalExportSchema>;

// --- Paginated list wrapper (generic for misc dashboard endpoints) ---

export const PaginatedListSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    page_size: z.number(),
    total_pages: z.number(),
  });
