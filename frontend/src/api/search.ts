/**
 * TanStack Query hooks for the Unified Search API.
 */
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PaginatedSearchResultsSchema,
  type PaginatedSearchResults,
  type UnifiedSearchFilter,
} from '@/schemas/search';

const API_BASE = '/api/search';

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
    filters.result_types.forEach((t) => params.append('result_types', t));
  }
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  return params.toString();
}

export function useUnifiedSearch(filters: Partial<UnifiedSearchFilter> = {}) {
  const queryString = buildSearchParams(filters);
  return useQuery<PaginatedSearchResults>({
    queryKey: ['unified-search', filters],
    queryFn: () => fetchJson(`${API_BASE}/?${queryString}`, PaginatedSearchResultsSchema),
  });
}

// --- Autocomplete ---

const AutocompleteResultSchema = z.object({
  result_type: z.enum(['idea', 'recipe', 'tag', 'event']),
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  url: z.string(),
  score: z.number(),
});
export type AutocompleteResult = z.infer<typeof AutocompleteResultSchema>;

export function useUnifiedAutocomplete(q: string) {
  return useQuery<AutocompleteResult[]>({
    queryKey: ['unified-autocomplete', q],
    queryFn: () =>
      fetchJson(
        `${API_BASE}/autocomplete/?q=${encodeURIComponent(q)}`,
        z.array(AutocompleteResultSchema),
      ),
    enabled: q.length >= 2,
    staleTime: 30_000,
  });
}
