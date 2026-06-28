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
  by_context: z.array(AiContextStatsSchema),
  timeline: z.array(AiTimelineEntrySchema),
});
export type AiInteractionStats = z.infer<typeof AiInteractionStatsSchema>;
