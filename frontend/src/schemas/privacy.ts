/**
 * Zod schemas for Privacy API.
 * MUST stay in sync with backend/profiles/schemas/privacy.py
 */
import { z } from 'zod';

// --- Data Overview Schemas ---

export const CategorySchema = z.object({
  count: z.number(),
  items: z.array(z.record(z.string(), z.unknown())),
});
export type Category = z.infer<typeof CategorySchema>;

export const AnalyticsDataSchema = z.object({
  view_count: z.number(),
  search_count: z.number(),
});
export type AnalyticsData = z.infer<typeof AnalyticsDataSchema>;

export const DataOverviewSchema = z.object({
  profile: z.record(z.string(), z.unknown()),
  preferences: z.record(z.string(), z.unknown()).nullable().optional(),
  groups: CategorySchema,
  persons: CategorySchema,
  events: CategorySchema,
  content: CategorySchema,
  comments: CategorySchema,
  interactions: CategorySchema,
  planning: CategorySchema,
  packing_lists: CategorySchema,
  analytics: AnalyticsDataSchema,
});
export type DataOverview = z.infer<typeof DataOverviewSchema>;

// --- Account Deletion Schemas ---

export const DeleteAccountRequestSchema = z.object({
  password: z.string().nullable(),
  confirmation: z.literal('KONTO LÖSCHEN'),
});
export type DeleteAccountRequest = z.infer<typeof DeleteAccountRequestSchema>;
