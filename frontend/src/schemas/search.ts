/**
 * Zod schemas for the Unified Search API.
 * MUST stay in sync with backend/content/api.py (PaginatedSearchOut, UnifiedSearchResultOut)
 */
import { z } from 'zod';

// --- Unified Search Result ---

export const UnifiedSearchResultSchema = z.object({
  result_type: z.enum(['session', 'blog', 'game', 'recipe', 'tag', 'event']),
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
  type_counts: z.record(z.string(), z.number()).default({}),
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

// --- Result Type Options (for UI filter chips / tabs) ---

export const RESULT_TYPE_OPTIONS = [
  { value: 'session', label: 'Gruppenstunden', icon: 'groups' },
  { value: 'blog', label: 'Wissensbeiträge', icon: 'article' },
  { value: 'game', label: 'Spiele', icon: 'sports_esports' },
  { value: 'recipe', label: 'Rezepte', icon: 'menu_book' },
  { value: 'tag', label: 'Tags', icon: 'label' },
  { value: 'event', label: 'Events', icon: 'event' },
] as const;

// --- Result Type Labels & Colors (for badges) ---

export const RESULT_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  session: { label: 'Gruppenstunde', icon: 'groups', color: 'text-sky-700', bgColor: 'bg-sky-50 border-sky-200' },
  blog: { label: 'Wissensbeitrag', icon: 'article', color: 'text-indigo-700', bgColor: 'bg-indigo-50 border-indigo-200' },
  game: { label: 'Spiel', icon: 'sports_esports', color: 'text-emerald-700', bgColor: 'bg-emerald-50 border-emerald-200' },
  recipe: { label: 'Rezept', icon: 'menu_book', color: 'text-rose-700', bgColor: 'bg-rose-50 border-rose-200' },
  tag: { label: 'Tag', icon: 'label', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200' },
  event: { label: 'Event', icon: 'event', color: 'text-violet-700', bgColor: 'bg-violet-50 border-violet-200' },
};
