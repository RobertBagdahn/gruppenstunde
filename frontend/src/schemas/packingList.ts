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
  is_do_not_bring: z.boolean(),
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

export const PackingListShareSchema = z.object({
  id: z.number(),
  token: z.string(),
  label: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
});
export type PackingListShare = z.infer<typeof PackingListShareSchema>;

export const PackingListSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  owner_id: z.number(),
  owner_name: z.string(),
  group_id: z.number().nullable(),
  group_name: z.string(),
  is_template: z.boolean(),
  visibility: z.enum(['private', 'link_only']),
  activity_type: z.string().nullable(),
  duration: z.string().nullable(),
  season: z.string().nullable(),
  age_group: z.string().nullable(),
  can_edit: z.boolean(),
  categories: z.array(PackingCategorySchema),
  shares: z.array(PackingListShareSchema),
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
  visibility: z.enum(['private', 'link_only']),
  activity_type: z.string().nullable(),
  duration: z.string().nullable(),
  season: z.string().nullable(),
  age_group: z.string().nullable(),
  category_count: z.number(),
  item_count: z.number(),
  checked_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PackingListSummary = z.infer<typeof PackingListSummarySchema>;

// ---------------------------------------------------------------------------
// Shared Packing List (loaded via share token)
// ---------------------------------------------------------------------------

export const SharedPackingItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  quantity: z.string(),
  description: z.string(),
  is_checked: z.boolean(),
  is_do_not_bring: z.boolean(),
  sort_order: z.number(),
  supply_type: z.string().nullable().optional(),
  supply_id: z.number().nullable().optional(),
  supply_name: z.string().nullable().optional(),
});
export type SharedPackingItem = z.infer<typeof SharedPackingItemSchema>;

export const SharedPackingCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  sort_order: z.number(),
  items: z.array(SharedPackingItemSchema),
});
export type SharedPackingCategory = z.infer<typeof SharedPackingCategorySchema>;

export const SharedPackingListSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  owner_name: z.string(),
  categories: z.array(SharedPackingCategorySchema),
  share_token: z.string(),
  share_label: z.string(),
});
export type SharedPackingList = z.infer<typeof SharedPackingListSchema>;

// ---------------------------------------------------------------------------
// Suggestion Schemas
// ---------------------------------------------------------------------------

export const SuggestionItemSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  is_do_not_bring: z.boolean(),
});
export type SuggestionItem = z.infer<typeof SuggestionItemSchema>;

export const SuggestionCategorySchema = z.object({
  name: z.string(),
  items: z.array(SuggestionItemSchema),
});
export type SuggestionCategory = z.infer<typeof SuggestionCategorySchema>;

export const CatalogSuggestionsSchema = z.object({
  categories: z.array(SuggestionCategorySchema),
  total_available: z.number(),
});
export type CatalogSuggestions = z.infer<typeof CatalogSuggestionsSchema>;

export const RandomSuggestionsSchema = z.object({
  items: z.array(SuggestionItemSchema),
});
export type RandomSuggestions = z.infer<typeof RandomSuggestionsSchema>;

export const AiSuggestionsSchema = z.object({
  items: z.array(SuggestionItemSchema),
});
export type AiSuggestions = z.infer<typeof AiSuggestionsSchema>;

export const SuggestionCategoriesSchema = z.object({
  categories: z.array(z.string()),
});
export type SuggestionCategories = z.infer<typeof SuggestionCategoriesSchema>;

// ---------------------------------------------------------------------------
// Wizard / Generate Schemas
// ---------------------------------------------------------------------------

export const GenerateContextSchema = z.object({
  activity: z.string(),
  duration: z.string(),
  season: z.string(),
  age_group: z.string().nullable().optional(),
});
export type GenerateContext = z.infer<typeof GenerateContextSchema>;

export const GeneratePackingListSchema = z.object({
  title: z.string(),
  context: GenerateContextSchema,
});
export type GeneratePackingListInput = z.infer<typeof GeneratePackingListSchema>;

export const PreviewCategorySchema = z.object({
  name: z.string(),
  item_count: z.number(),
});
export type PreviewCategory = z.infer<typeof PreviewCategorySchema>;

export const PreviewSchema = z.object({
  categories: z.array(PreviewCategorySchema),
  total_items: z.number(),
});
export type Preview = z.infer<typeof PreviewSchema>;

export const PresetSchema = z.object({
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  context: GenerateContextSchema,
});
export type Preset = z.infer<typeof PresetSchema>;

export const CatalogItemSchema = z.object({
  name: z.string(),
  quantity: z.string(),
  description: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
});
export type CatalogItem = z.infer<typeof CatalogItemSchema>;

export const FullCatalogSchema = z.object({
  items: z.array(CatalogItemSchema),
});
export type FullCatalog = z.infer<typeof FullCatalogSchema>;
