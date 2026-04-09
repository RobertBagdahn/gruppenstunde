/**
 * TanStack Query hooks for the Unified Search API.
 * Updated to use /api/content/search/ (new endpoint) with type_counts support.
 * MUST stay in sync with backend/content/api.py (PaginatedSearchOut, AutocompleteResultOut)
 */
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PaginatedSearchResultsSchema,
  type UnifiedSearchFilter,
} from '@/schemas/search';

const API_BASE = '/api/content';

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

function buildSearchParams(filters: Partial<UnifiedSearchFilter>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.result_types?.length) {
    // New API expects comma-separated string
    params.set('result_types', filters.result_types.join(','));
  }
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  return params.toString();
}

export function useUnifiedSearch(filters: Partial<UnifiedSearchFilter> = {}) {
  const queryString = buildSearchParams(filters);
  return useQuery({
    queryKey: ['unified-search', filters] as const,
    queryFn: () => fetchJson(`${API_BASE}/search/?${queryString}`, PaginatedSearchResultsSchema),
  });
}

// --- Autocomplete ---

const AutocompleteResultSchema = z.object({
  result_type: z.enum(['session', 'blog', 'game', 'recipe', 'idea', 'tag', 'event']),
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  url: z.string(),
  score: z.number(),
});
export type AutocompleteResult = z.infer<typeof AutocompleteResultSchema>;

export function useUnifiedAutocomplete(q: string) {
  return useQuery({
    queryKey: ['unified-autocomplete', q] as const,
    queryFn: () =>
      fetchJson(
        `${API_BASE}/autocomplete/?q=${encodeURIComponent(q)}`,
        z.array(AutocompleteResultSchema),
      ),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}
