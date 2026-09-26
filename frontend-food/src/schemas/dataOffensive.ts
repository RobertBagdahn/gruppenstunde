/**
 * Zod schemas for the data offensive cockpit.
 * MUST stay in sync with backend/supply/schemas/data_offensive.py
 */
import { z } from 'zod';

export const OffensiveSummarySchema = z.object({
  total: z.number(),
  issue_counts: z.record(z.string(), z.number()),
  nutrition_issue_counts: z.record(z.string(), z.number()),
  status_counts: z.record(z.string(), z.number()),
  verdict_counts: z.record(z.string(), z.number()),
  needs_review: z.number(),
  publishable: z.number(),
  estimated_review_cost_eur: z.number(),
  embeddings_missing: z.number(),
  exact_duplicate_groups: z.number(),
  near_duplicate_groups: z.number(),
  junk_recipes: z.number(),
  issue_labels: z.record(z.string(), z.string()),
  nutrition_issue_labels: z.record(z.string(), z.string()),
});
export type OffensiveSummary = z.infer<typeof OffensiveSummarySchema>;

export const OffensiveIngredientSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  status: z.string(),
  usage_count: z.number(),
  retail_section_id: z.number().nullable(),
  retail_section_name: z.string().nullable(),
  retail_section_source: z.string(),
  price_per_kg: z.number().nullable(),
  quality_score: z.number().nullable(),
  energy_kcal: z.number().nullable(),
  protein_g: z.number().nullable(),
  fat_g: z.number().nullable(),
  fat_sat_g: z.number().nullable(),
  carbohydrate_g: z.number().nullable(),
  sugar_g: z.number().nullable(),
  fibre_g: z.number().nullable(),
  salt_g: z.number().nullable(),
  issues: z.array(z.string()),
  nutrition_issues: z.array(z.string()),
  ai_review_verdict: z.string(),
  ai_reviewed_at: z.string().nullable(),
  ai_reason: z.string().nullable(),
  ai_confidence: z.number().nullable(),
  suggested_name: z.string().nullable(),
  duplicate_of_id: z.number().nullable(),
  duplicate_of_name: z.string().nullable(),
  suggestions: z.record(z.string(), z.number()),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});
export type OffensiveIngredient = z.infer<typeof OffensiveIngredientSchema>;

export const PaginatedOffensiveIngredientSchema = z.object({
  items: z.array(OffensiveIngredientSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedOffensiveIngredient = z.infer<typeof PaginatedOffensiveIngredientSchema>;

export const AiReviewRunSchema = z.object({
  reviewed: z.number(),
  remaining: z.number(),
  verdicts: z.record(z.string(), z.number()),
  changed_fields: z.record(z.string(), z.number()),
  errors: z.array(z.string()),
});
export type AiReviewRun = z.infer<typeof AiReviewRunSchema>;

export const BulkActionSchema = z.object({
  changed: z.number(),
  skipped: z.number(),
  remaining: z.number().default(0),
  messages: z.array(z.string()).default([]),
});
export type BulkAction = z.infer<typeof BulkActionSchema>;

export const DuplicateMemberSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  status: z.string(),
  usage_count: z.number(),
});

export const DuplicateGroupSchema = z.object({
  key: z.string(),
  items: z.array(DuplicateMemberSchema),
});
export type DuplicateGroup = z.infer<typeof DuplicateGroupSchema>;

export const PaginatedDuplicateGroupSchema = z.object({
  items: z.array(DuplicateGroupSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export const RetailSectionOptionSchema = z.object({
  id: z.number(),
  name: z.string(),
  rank: z.number(),
  ingredient_count: z.number(),
});
export type RetailSectionOption = z.infer<typeof RetailSectionOptionSchema>;

export const JunkRecipeSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  status: z.string(),
  recipe_type: z.string(),
  reason: z.string(),
});
export type JunkRecipe = z.infer<typeof JunkRecipeSchema>;

export type SuggestionField = 'name' | 'nutrition' | 'price';

export interface OffensiveIngredientPatch {
  name?: string;
  retail_section_id?: number | null;
  energy_kcal?: number | null;
  protein_g?: number | null;
  fat_g?: number | null;
  fat_sat_g?: number | null;
  carbohydrate_g?: number | null;
  sugar_g?: number | null;
  fibre_g?: number | null;
  salt_g?: number | null;
  price_per_kg?: number | null;
}

export interface OffensiveFilters {
  issue?: string;
  nutrition_issue?: string;
  section_id?: number;
  verdict?: string;
  status?: string;
  search?: string;
  used_only?: boolean;
  page?: number;
  page_size?: number;
}
