/**
 * TanStack Query hooks for the data offensive cockpit.
 * MUST stay in sync with backend/supply/api/data_offensive.py
 */
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/api';
import {
  AiReviewRunSchema,
  BulkActionSchema,
  JunkRecipeSchema,
  OffensiveIngredientSchema,
  OffensiveSummarySchema,
  PaginatedDuplicateGroupSchema,
  PaginatedOffensiveIngredientSchema,
  RetailSectionOptionSchema,
  type OffensiveFilters,
  type OffensiveIngredientPatch,
  type SuggestionField,
} from '@/schemas/dataOffensive';

const BASE = `${API_BASE_URL}/api/admin/data-quality/offensive`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function request<T>(url: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `API-Fehler: ${res.status}`);
  }
  return schema.parse(await res.json());
}

function post<T>(path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>, body: unknown = {}): Promise<T> {
  return request(`${BASE}${path}`, schema, { method: 'POST', body: JSON.stringify(body) });
}

function filterParams(filters: OffensiveFilters): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) return;
    params.set(key, String(value));
  });
  return params;
}

export const offensiveKeys = {
  all: ['data-offensive'] as const,
  summary: ['data-offensive', 'summary'] as const,
  ingredients: (filters: OffensiveFilters) => ['data-offensive', 'ingredients', filters] as const,
  duplicates: (page: number) => ['data-offensive', 'duplicates', page] as const,
  sections: ['data-offensive', 'sections'] as const,
  junkRecipes: ['data-offensive', 'junk-recipes'] as const,
};

/** Invalidate every cockpit query plus the regular ingredient caches. */
function useInvalidateOffensive() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: offensiveKeys.all });
    queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    queryClient.invalidateQueries({ queryKey: ['ingredient'] });
    queryClient.invalidateQueries({ queryKey: ['nutrition-plausibility'] });
  };
}

export function useOffensiveSummary() {
  return useQuery({
    queryKey: offensiveKeys.summary,
    queryFn: () => request(`${BASE}/summary/`, OffensiveSummarySchema),
  });
}

export function useOffensiveIngredients(filters: OffensiveFilters) {
  return useQuery({
    queryKey: offensiveKeys.ingredients(filters),
    queryFn: () =>
      request(`${BASE}/ingredients/?${filterParams(filters)}`, PaginatedOffensiveIngredientSchema),
    placeholderData: keepPreviousData,
  });
}

export async function fetchOffensiveIngredientIds(filters: OffensiveFilters): Promise<number[]> {
  const params = filterParams({ ...filters, page: undefined, page_size: undefined });
  return request(`${BASE}/ingredients/ids/?${params}`, z.array(z.number()));
}

export function useRetailSectionOptions() {
  return useQuery({
    queryKey: offensiveKeys.sections,
    queryFn: () => request(`${BASE}/retail-sections/`, z.array(RetailSectionOptionSchema)),
    staleTime: 60_000,
  });
}

export function useDuplicateGroups(page: number) {
  return useQuery({
    queryKey: offensiveKeys.duplicates(page),
    queryFn: () => request(`${BASE}/duplicate-groups/?page=${page}&page_size=10`, PaginatedDuplicateGroupSchema),
    placeholderData: keepPreviousData,
  });
}

export function useJunkRecipes() {
  return useQuery({
    queryKey: offensiveKeys.junkRecipes,
    queryFn: () => request(`${BASE}/recipes/junk/`, z.array(JunkRecipeSchema)),
  });
}

export function usePatchOffensiveIngredient() {
  const invalidate = useInvalidateOffensive();
  return useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: OffensiveIngredientPatch }) =>
      request(`${BASE}/ingredients/${id}/`, OffensiveIngredientSchema, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: invalidate,
  });
}

/** One chunk of the AI review queue (or the given ids). */
export function runAiReviewChunk(body: { ids?: number[]; limit?: number; force?: boolean }) {
  return post('/ai-review/', AiReviewRunSchema, body);
}

/** One chunk of the embedding backfill. */
export function runEmbeddingChunk(limit = 60) {
  return post('/embeddings/', BulkActionSchema, { limit });
}

type BulkEndpoint =
  | '/repair-nutrition/'
  | '/reclassify-sections/'
  | '/merge-exact-duplicates/'
  | '/auto-resolve/'
  | '/publish/'
  | '/soft-delete/'
  | '/recipes/archive/'
  | '/recipes/recategorize/';

export function useOffensiveBulkAction(path: BulkEndpoint) {
  const invalidate = useInvalidateOffensive();
  return useMutation({
    mutationFn: (ids: number[] = []) => post(path, BulkActionSchema, { ids }),
    onSuccess: invalidate,
  });
}

export function useApplySuggestions() {
  const invalidate = useInvalidateOffensive();
  return useMutation({
    mutationFn: ({ ids, fields }: { ids: number[]; fields: SuggestionField[] }) =>
      post('/apply-suggestions/', BulkActionSchema, { ids, fields }),
    onSuccess: invalidate,
  });
}

export function useMergeGroup() {
  const invalidate = useInvalidateOffensive();
  return useMutation({
    mutationFn: ({ targetId, sourceIds }: { targetId: number; sourceIds: number[] }) =>
      post('/merge-group/', BulkActionSchema, { target_id: targetId, source_ids: sourceIds }),
    onSuccess: invalidate,
  });
}

export { useInvalidateOffensive };
