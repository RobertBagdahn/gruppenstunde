/**
 * Zod schemas for the Unified Search API.
 * MUST stay in sync with backend/core/api.py (UnifiedSearchResultOut, PaginatedSearchOut)
 */
import { z } from 'zod';

// --- Unified Search Result ---

export const UnifiedSearchResultSchema = z.object({
  result_type: z.enum(['idea', 'recipe', 'tag', 'event']),
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  image_url: z.string().nullable(),
  url: z.string(),
  score: z.number(),
  created_at: z.string(),
  extra: z.record(z.string(), z.unknown()),
});
export type UnifiedSearchResult = z.infer<typeof UnifiedSearchResultSchema>;

export const PaginatedSearchResultsSchema = z.object({
  items: z.array(UnifiedSearchResultSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedSearchResults = z.infer<typeof PaginatedSearchResultsSchema>;

// --- Search Filter ---

export const UnifiedSearchFilterSchema = z.object({
  q: z.string().optional(),
  result_types: z.array(z.string()).optional(),
  sort: z.string().default('relevant'),
  page: z.number().default(1),
  page_size: z.number().default(20),
});
export type UnifiedSearchFilter = z.infer<typeof UnifiedSearchFilterSchema>;

// --- Result Type Options (for UI filter chips) ---

export const RESULT_TYPE_OPTIONS = [
  { value: 'idea', label: 'Ideen', icon: 'lightbulb' },
  { value: 'recipe', label: 'Rezepte', icon: 'menu_book' },
  { value: 'tag', label: 'Tags', icon: 'label' },
  { value: 'event', label: 'Events', icon: 'event' },
] as const;

// --- Result Type Labels & Colors (for badges) ---

export const RESULT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  idea: { label: 'Idee', icon: 'lightbulb', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  recipe: { label: 'Rezept', icon: 'menu_book', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200' },
  tag: { label: 'Tag', icon: 'label', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  event: { label: 'Event', icon: 'event', color: 'text-purple-700', bgColor: 'bg-purple-50 border-purple-200' },
};
