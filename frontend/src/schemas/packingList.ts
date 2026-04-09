/**
 * Zod schemas for Packing List API.
 * MUST stay in sync with backend/packinglist/schemas.py
 */
import { z } from 'zod';

export const PackingItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  quantity: z.string(),
  description: z.string(),
  is_checked: z.boolean(),
  sort_order: z.number(),
  supply_type: z.string().nullable().optional(),
  supply_id: z.number().nullable().optional(),
  supply_name: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PackingItem = z.infer<typeof PackingItemSchema>;

export const PackingCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  sort_order: z.number(),
  items: z.array(PackingItemSchema),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PackingCategory = z.infer<typeof PackingCategorySchema>;

export const PackingListSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  owner_id: z.number(),
  owner_name: z.string(),
  group_id: z.number().nullable(),
  group_name: z.string(),
  is_template: z.boolean(),
  can_edit: z.boolean(),
  categories: z.array(PackingCategorySchema),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PackingList = z.infer<typeof PackingListSchema>;

export const PackingListSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  owner_id: z.number(),
  owner_name: z.string(),
  group_id: z.number().nullable(),
  group_name: z.string(),
  is_template: z.boolean(),
  category_count: z.number(),
  item_count: z.number(),
  checked_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PackingListSummary = z.infer<typeof PackingListSummarySchema>;
