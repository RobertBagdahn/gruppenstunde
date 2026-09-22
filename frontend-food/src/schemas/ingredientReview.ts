import { z } from 'zod';

export const ReviewRecipeDraftSchema = z.object({
  title: z.string(),
  description: z.string().default(''),
  summary: z.string().default(''),
  servings: z.number().nullable(),
  preparation_time: z.number().nullable(),
  execution_time: z.number().nullable(),
  recipe_type: z.string(),
  difficulty: z.string().default('easy'),
  execution_time_choice: z.string().default('less_30'),
  preparation_time_choice: z.string().default('none'),
  scout_level_ids: z.array(z.number()).default([]),
  tag_ids: z.array(z.string()).default([]),
  steps: z.array(z.string()).default([]),
  source_url: z.string().default(''),
  image_url: z.string().default(''),
});

export const RecipeImportSourceSchema = z.object({
  type: z.enum(['url', 'text']),
  value: z.string().min(1),
});
export type RecipeImportSource = z.infer<typeof RecipeImportSourceSchema>;

export const ReviewSourceSchema = z.object({
  type: z.enum(['url', 'text']),
  label: z.string(),
  value: z.string(),
});
export type ReviewSource = z.infer<typeof ReviewSourceSchema>;

export const IngredientMatchCandidateSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string().default(''),
  confidence: z.number().min(0).max(1),
});
export type IngredientMatchCandidate = z.infer<typeof IngredientMatchCandidateSchema>;

export const ReviewTechnicalDetailsSchema = z.object({
  method: z.string(),
  confidence: z.number().min(0).max(1),
  candidates: z.array(IngredientMatchCandidateSchema).default([]),
});

export const ReviewPortionSchema = z.object({
  id: z.number().nullable().default(null),
  name: z.string(),
  quantity: z.number().positive(),
  weight_g: z.number().positive().nullable().default(null),
  measuring_unit_id: z.number().nullable().default(null),
  measuring_unit_name: z.string().nullable().default(null),
  is_new: z.boolean().default(false),
});
export type ReviewPortion = z.infer<typeof ReviewPortionSchema>;

export const TemporaryIngredientDraftSchema = z.object({
  name: z.string(),
  description: z.string().default(''),
  status: z.string().default('draft'),
  values: z.record(z.unknown()).default({}),
  portions: z.array(ReviewPortionSchema).default([]),
  quantity: z.number().positive().nullable().default(null),
});
export type TemporaryIngredientDraft = z.infer<typeof TemporaryIngredientDraftSchema>;

export const IngredientReviewRowSchema = z.object({
  key: z.string(),
  source_text: z.string(),
  sources: z.array(ReviewSourceSchema).default([]),
  selected_ingredient_id: z.number().nullable().default(null),
  selected_ingredient_slug: z.string().default(''),
  selected_ingredient_name: z.string().default(''),
  suggested_ingredient_id: z.number().nullable().default(null),
  suggested_ingredient_name: z.string().default(''),
  candidates: z.array(IngredientMatchCandidateSchema).default([]),
  selected_portion: ReviewPortionSchema.nullable().default(null),
  suggested_portion: ReviewPortionSchema.nullable().default(null),
  quantity: z.number().positive().nullable().default(null),
  suggested_quantity: z.number().positive().nullable().default(null),
  reason: z.string().default(''),
  technical_details: ReviewTechnicalDetailsSchema.nullable().default(null),
  conflicts: z.array(z.string()).default([]),
  new_ingredient_draft: TemporaryIngredientDraftSchema.nullable().default(null),
  status: z.enum(['open', 'changed', 'confirmed', 'unresolved']).default('open'),
});
export type IngredientReviewRow = z.infer<typeof IngredientReviewRowSchema>;

export const IngredientReviewPreviewSchema = z.object({
  rows: z.array(IngredientReviewRowSchema).default([]),
  sources: z.array(ReviewSourceSchema).default([]),
  ai_interaction_id: z.string().nullable().default(null),
  recipe_draft: ReviewRecipeDraftSchema,
  // True when the page was unreachable and the data was reconstructed via
  // search grounding. The UI must ask the user to verify it.
  is_reconstructed: z.boolean().optional().default(false),
});
export type IngredientReviewPreview = z.infer<typeof IngredientReviewPreviewSchema>;

export const IngredientReviewRowInputSchema = z.object({
  key: z.string(),
  status: z.literal('confirmed'),
  selected_ingredient_id: z.number().nullable().default(null),
  selected_portion_id: z.number().nullable().default(null),
  quantity: z.number().positive(),
  temporary_ingredient: TemporaryIngredientDraftSchema.nullable().default(null),
});
export type IngredientReviewRowInput = z.infer<typeof IngredientReviewRowInputSchema>;

export const IngredientReviewFinalizeSchema = z.object({
  rows: z.array(IngredientReviewRowInputSchema).min(1),
});
export type IngredientReviewFinalize = z.infer<typeof IngredientReviewFinalizeSchema>;

export const ReviewFieldErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const IngredientReviewErrorSchema = z.object({
  message: z.string(),
  fields: z.array(ReviewFieldErrorSchema).default([]),
});
