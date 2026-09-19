/** Zod schemas for portion repair findings. MUST stay in sync with backend/supply/schemas/portion_repair.py */

import { z } from 'zod';

export const PortionRepairFindingSchema = z.object({
  id: z.number(),
  portion_id: z.number(),
  ingredient_id: z.number(),
  ingredient_name: z.string(),
  portion_name: z.string(),
  detection_reason: z.enum([
    'piece_name_one_gram',
    'piece_name_gram_unit',
    'one_gram_placeholder',
    'missing_weight',
    'implausible_rank1',
  ]),
  status: z.enum(['candidate', 'pending_review', 'ready', 'applied', 'rejected', 'skipped']),
  before_snapshot: z.object({
    name: z.string(),
    weight_g: z.number().nullable(),
    quantity: z.number(),
    rank: z.number(),
    measuring_unit_id: z.number().nullable(),
    measuring_unit_name: z.string().nullable(),
    measuring_unit_unit: z.string().nullable(),
  }),
  recipe_item_ids: z.array(z.number()),
  ai_proposal: z
    .object({
      classification: z.string(),
      proposed_name: z.string(),
      proposed_weight_g: z.number().nullable(),
      proposed_quantity: z.number(),
      proposed_unit_name: z.string(),
      confidence: z.number(),
      rationale: z.string(),
    })
    .partial(),
  confidence: z.number().nullable(),
  prompt_version: z.string(),
  threshold: z.number().nullable(),
  applied_portion_id: z.number().nullable(),
  moved_recipe_item_ids: z.array(z.number()),
  affected_recipe_ids: z.array(z.number()),
  applied_at: z.string().nullable(),
  rejected_at: z.string().nullable(),
  approved_at: z.string().nullable(),
  created_at: z.string(),
  repair_path: z.enum(['automatic', 'review', 'delete']).default('review'),
  suggested_weight_g: z.number().nullable().default(null),
});
export type PortionRepairFinding = z.infer<typeof PortionRepairFindingSchema>;

export const PaginatedPortionRepairFindingSchema = z.object({
  items: z.array(PortionRepairFindingSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedPortionRepairFinding = z.infer<typeof PaginatedPortionRepairFindingSchema>;

export const PortionRepairApplyResponseSchema = z.object({
  applied: z.boolean(),
  finding_id: z.number(),
  applied_portion_id: z.number().nullable(),
  moved_recipe_item_ids: z.array(z.number()),
  affected_recipe_ids: z.array(z.number()),
});
export type PortionRepairApplyResponse = z.infer<typeof PortionRepairApplyResponseSchema>;

export const PortionRepairRejectResponseSchema = z.object({
  finding_id: z.number(),
  status: z.string(),
});
export type PortionRepairRejectResponse = z.infer<typeof PortionRepairRejectResponseSchema>;

export const PortionRepairProcessResponseSchema = z.object({
  processed: z.number(),
  ready: z.number(),
  pending_review: z.number(),
  skipped: z.number(),
  failed: z.number(),
});
export type PortionRepairProcessResponse = z.infer<typeof PortionRepairProcessResponseSchema>;

export const PortionRepairApproveResponseSchema = z.object({
  finding_id: z.number(),
  status: z.string(),
});

export const PortionRepairBulkApplyResponseSchema = z.object({
  applied: z.array(z.number()),
  blocked: z.array(z.number()),
  failed: z.array(z.number()),
});

export const PortionRepairBulkApproveResponseSchema = z.object({
  approved: z.array(z.number()),
  blocked: z.array(z.number()),
});
