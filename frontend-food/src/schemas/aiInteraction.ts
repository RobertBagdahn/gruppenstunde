import { z } from 'zod';

export const AiVoteInSchema = z.object({
  vote: z.enum(['up', 'down']),
});
export type AiVoteIn = z.infer<typeof AiVoteInSchema>;

export const AiVoteOutSchema = z.object({
  status: z.literal('ok'),
});
export type AiVoteOut = z.infer<typeof AiVoteOutSchema>;

export const AiContextStatsSchema = z.object({
  context: z.string(),
  label: z.string(),
  total: z.number(),
  success_count: z.number(),
  error_count: z.number(),
  thumbs_up: z.number(),
  thumbs_down: z.number(),
  vote_rate: z.number(),
  total_tokens: z.number(),
  total_cost_eur: z.number(),
});
export type AiContextStats = z.infer<typeof AiContextStatsSchema>;

export const AiTimelineEntrySchema = z.object({
  date: z.string(),
  total: z.number(),
  thumbs_up: z.number(),
  thumbs_down: z.number(),
});
export type AiTimelineEntry = z.infer<typeof AiTimelineEntrySchema>;

export const AiInteractionStatsSchema = z.object({
  total_calls: z.number(),
  calls_today: z.number(),
  voted_calls: z.number(),
  vote_rate: z.number(),
  total_tokens_all: z.number(),
  total_cost_eur: z.number(),
  by_context: z.array(AiContextStatsSchema),
  timeline: z.array(AiTimelineEntrySchema),
});
export type AiInteractionStats = z.infer<typeof AiInteractionStatsSchema>;

export const AiInteractionItemSchema = z.object({
  id: z.string().uuid(),
  context: z.string(),
  model: z.string(),
  user_name: z.string().nullable(),
  created_at: z.string(),
  total_tokens: z.number().nullable(),
  cost_eur: z.number().nullable(),
  duration_ms: z.number().nullable(),
  success: z.boolean(),
  error_code: z.string(),
  vote: z.string().nullable(),
  is_background: z.boolean(),
});
export type AiInteractionItem = z.infer<typeof AiInteractionItemSchema>;

export const AiInteractionDetailSchema = AiInteractionItemSchema.extend({
  prompt: z.union([z.record(z.unknown()), z.array(z.unknown()), z.string()]).nullable(),
  response: z.string(),
});
export type AiInteractionDetail = z.infer<typeof AiInteractionDetailSchema>;

export const UserCostSchema = z.object({
  user_id: z.number(),
  user_name: z.string(),
  total_calls: z.number(),
  total_tokens: z.number(),
  total_cost_eur: z.number(),
  cost_30d_eur: z.number(),
  vote_rate: z.number(),
});
export type UserCost = z.infer<typeof UserCostSchema>;

export const PaginatedAiInteractionsSchema = z.object({
  items: z.array(AiInteractionItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedAiInteractions = z.infer<typeof PaginatedAiInteractionsSchema>;
