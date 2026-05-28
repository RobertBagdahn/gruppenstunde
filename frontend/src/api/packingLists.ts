/**
 * TanStack Query hooks for the Packing List API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PackingListSchema,
  PackingListSummarySchema,
  PackingListShareSchema,
  PackingItemSchema,
  PackingCategorySchema,
  SharedPackingListSchema,
  CatalogSuggestionsSchema,
  RandomSuggestionsSchema,
  AiSuggestionsSchema,
  SuggestionCategoriesSchema,
  PreviewSchema,
  PresetSchema,
  FullCatalogSchema,
  type PackingList,
  type PackingListSummary,
  type PackingListShare,
  type SharedPackingList,
  type CatalogSuggestions,
  type RandomSuggestions,
  type AiSuggestions,
  type Preview,
  type Preset,
  type FullCatalog,
  type GeneratePackingListInput,
  type GenerateContext,
} from '@/schemas/packingList';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/api';

const API_BASE = `${API_BASE_URL}/api/packing-lists`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function postJson<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function patchJson<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function deleteJson(url: string): Promise<void> {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'X-CSRFToken': getCsrfToken() },
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
}

async function postSimple(url: string, body?: unknown): Promise<{ success: boolean; message: string }> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// ==========================================================================
// Packing List Hooks
// ==========================================================================

export function usePackingLists() {
  return useQuery<PackingListSummary[]>({
    queryKey: ['packing-lists'],
    queryFn: () => fetchJson(`${API_BASE}/`, z.array(PackingListSummarySchema)),
  });
}

export function usePackingListTemplates() {
  return useQuery<PackingListSummary[]>({
    queryKey: ['packing-list-templates'],
    queryFn: () => fetchJson(`${API_BASE}/templates/`, z.array(PackingListSummarySchema)),
  });
}

export function usePackingList(id: number) {
  return useQuery<PackingList>({
    queryKey: ['packing-list', id],
    queryFn: () => fetchJson(`${API_BASE}/${id}/`, PackingListSchema),
    enabled: id > 0,
  });
}

export function useCreatePackingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string; group_id?: number | null; visibility?: string }) =>
      postJson(`${API_BASE}/`, body, PackingListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-lists'] });
    },
  });
}

export function useUpdatePackingList(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; description?: string; group_id?: number | null; visibility?: string }) =>
      patchJson(`${API_BASE}/${id}/`, body, PackingListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-lists'] });
      queryClient.invalidateQueries({ queryKey: ['packing-list', id] });
    },
  });
}

export function useDeletePackingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${API_BASE}/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-lists'] });
    },
  });
}

export function useClonePackingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      postJson(`${API_BASE}/${id}/clone/`, {}, PackingListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-lists'] });
    },
  });
}

export function useResetChecks(packingListId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postSimple(`${API_BASE}/${packingListId}/reset-checks/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
      queryClient.invalidateQueries({ queryKey: ['packing-lists'] });
    },
  });
}

export async function fetchExportText(id: number): Promise<string> {
  const res = await fetch(`${API_BASE}/${id}/export/text/`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Export error: ${res.status}`);
  return res.text();
}

// ==========================================================================
// Category Hooks
// ==========================================================================

export function useCreateCategory(packingListId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; sort_order?: number }) =>
      postJson(`${API_BASE}/${packingListId}/categories/`, body, PackingCategorySchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
    },
  });
}

export function useUpdateCategory(packingListId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, ...body }: { categoryId: number; name?: string; sort_order?: number }) =>
      patchJson(`${API_BASE}/${packingListId}/categories/${categoryId}/`, body, PackingCategorySchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
    },
  });
}

export function useDeleteCategory(packingListId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: number) =>
      deleteJson(`${API_BASE}/${packingListId}/categories/${categoryId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
    },
  });
}

export function useSortCategories(packingListId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: number[]) =>
      postJson(
        `${API_BASE}/${packingListId}/categories/sort/`,
        { ordered_ids: orderedIds },
        z.object({ success: z.boolean(), message: z.string() }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
    },
  });
}

// ==========================================================================
// Item Hooks
// ==========================================================================

export function useCreateItem(packingListId: number, categoryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; quantity?: string; description?: string; is_do_not_bring?: boolean }) =>
      postJson(
        `${API_BASE}/${packingListId}/categories/${categoryId}/items/`,
        body,
        PackingItemSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
    },
  });
}

/**
 * Create an item in any category (categoryId passed per mutation call).
 * Used by the suggestion panel where the target category changes dynamically.
 */
export function useCreateItemDynamic(packingListId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      ...body
    }: {
      categoryId: number;
      name: string;
      quantity?: string;
      description?: string;
      is_do_not_bring?: boolean;
    }) =>
      postJson(
        `${API_BASE}/${packingListId}/categories/${categoryId}/items/`,
        body,
        PackingItemSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
      queryClient.invalidateQueries({ queryKey: ['packing-list-suggestions-random', packingListId] });
    },
  });
}

export function useUpdateItem(packingListId: number, categoryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      ...body
    }: {
      itemId: number;
      name?: string;
      quantity?: string;
      description?: string;
      is_checked?: boolean;
      is_do_not_bring?: boolean;
      sort_order?: number;
    }) =>
      patchJson(
        `${API_BASE}/${packingListId}/categories/${categoryId}/items/${itemId}/`,
        body,
        PackingItemSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
    },
  });
}

export function useDeleteItem(packingListId: number, categoryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      deleteJson(
        `${API_BASE}/${packingListId}/categories/${categoryId}/items/${itemId}/`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
    },
  });
}

export function useSortItems(packingListId: number, categoryId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: number[]) =>
      postJson(
        `${API_BASE}/${packingListId}/categories/${categoryId}/items/sort/`,
        { ordered_ids: orderedIds },
        z.object({ success: z.boolean(), message: z.string() }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
    },
  });
}

// ==========================================================================
// Share Link Hooks
// ==========================================================================

export function useCreateShare(packingListId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { label?: string }) =>
      postJson(`${API_BASE}/${packingListId}/shares/`, body, PackingListShareSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
      queryClient.invalidateQueries({ queryKey: ['packing-list-shares', packingListId] });
    },
  });
}

export function usePackingListShares(packingListId: number) {
  return useQuery<PackingListShare[]>({
    queryKey: ['packing-list-shares', packingListId],
    queryFn: () => fetchJson(`${API_BASE}/${packingListId}/shares/`, z.array(PackingListShareSchema)),
    enabled: packingListId > 0,
  });
}

export function useDeactivateShare(packingListId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (shareId: number) =>
      deleteJson(`${API_BASE}/${packingListId}/shares/${shareId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list', packingListId] });
      queryClient.invalidateQueries({ queryKey: ['packing-list-shares', packingListId] });
    },
  });
}

export function useSharedPackingList(token: string) {
  return useQuery<SharedPackingList>({
    queryKey: ['shared-packing-list', token],
    queryFn: () => fetchJson(`${API_BASE}/shared/${token}/`, SharedPackingListSchema),
    enabled: !!token,
  });
}

export function useUpdateShareCheck(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { item_id: number; is_checked: boolean }) =>
      patchJson(
        `${API_BASE}/shared/${token}/checks/`,
        body,
        z.object({ success: z.boolean(), is_checked: z.boolean() }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-packing-list', token] });
    },
  });
}

// ==========================================================================
// Suggestion Hooks
// ==========================================================================

export function useCatalogSuggestions(
  packingListId: number,
  options?: { category?: string; search?: string; enabled?: boolean },
) {
  const params = new URLSearchParams();
  if (options?.category) params.set('category', options.category);
  if (options?.search) params.set('search', options.search);
  const qs = params.toString();
  const url = `${API_BASE}/${packingListId}/suggestions/catalog/${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: ['packing-list-suggestions-catalog', packingListId, options?.category, options?.search] as const,
    queryFn: async (): Promise<CatalogSuggestions> => {
      const data = await fetchJson(url, CatalogSuggestionsSchema);
      return data;
    },
    enabled: (options?.enabled ?? true) && packingListId > 0,
    staleTime: 60_000,
  });
}

export function useRandomSuggestions(packingListId: number, count: number = 8) {
  return useQuery({
    queryKey: ['packing-list-suggestions-random', packingListId] as const,
    queryFn: async (): Promise<RandomSuggestions> => {
      const data = await fetchJson(
        `${API_BASE}/${packingListId}/suggestions/random/?count=${count}`,
        RandomSuggestionsSchema,
      );
      return data;
    },
    enabled: packingListId > 0,
    staleTime: 30_000,
  });
}

export function useSuggestionCategories() {
  return useQuery({
    queryKey: ['packing-list-suggestion-categories'] as const,
    queryFn: async () => {
      const data = await fetchJson(`${API_BASE}/suggestions/categories/`, SuggestionCategoriesSchema);
      return data;
    },
    staleTime: 300_000,
  });
}

export function useAiSuggestItems(packingListId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { category?: string; count?: number }): Promise<AiSuggestions> => {
      const data = await postJson(`${API_BASE}/${packingListId}/suggestions/ai/`, body, AiSuggestionsSchema);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-list-suggestions-random', packingListId] });
    },
  });
}

// ==========================================================================
// Wizard Hooks (Generate, Preview, Presets, Catalog)
// ==========================================================================

export function useGeneratePackingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GeneratePackingListInput): Promise<PackingList> =>
      postJson(`${API_BASE}/generate/`, body, PackingListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-lists'] });
    },
  });
}

export function usePreviewPackingList() {
  return useMutation({
    mutationFn: (context: GenerateContext): Promise<Preview> =>
      postJson(`${API_BASE}/preview/`, { context }, PreviewSchema),
  });
}

export function usePresets() {
  return useQuery<Preset[]>({
    queryKey: ['packing-list-presets'],
    queryFn: () => fetchJson(`${API_BASE}/presets/`, z.array(PresetSchema)),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useFullCatalog() {
  return useQuery<FullCatalog>({
    queryKey: ['packing-list-catalog'],
    queryFn: () => fetchJson(`${API_BASE}/catalog/`, FullCatalogSchema),
    staleTime: 60 * 60 * 1000, // 1 hour
  });
}
