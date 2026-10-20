import { z } from 'zod';

/** One stage of the data pipeline shown in the top bar (MON-11). */
export const pipelineStageSchema = z.object({
  key: z.string(),
  label: z.string(),
  /** ISO timestamp of the last completed step; null if the stage never ran. */
  finished_at: z.string().nullable(),
  status: z.enum(['ok', 'warn', 'error']),
});

/** Response of `GET /api/status`: data freshness, reference date and navigation counters. */
export const statusSchema = z.object({
  /** The date the app treats as "today" (ISO date). */
  reference_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  iso_week: z.number().int().min(1).max(53),
  stages: z.array(pipelineStageSchema),
  /** Counters keyed like `NavItem.badge.key`. */
  badges: z.record(z.string(), z.number().int().nonnegative()).default({}),
  user: z.object({ name: z.string(), role: z.string() }).nullable().default(null),
});

export type PipelineStageDto = z.infer<typeof pipelineStageSchema>;
export type StatusDto = z.infer<typeof statusSchema>;
