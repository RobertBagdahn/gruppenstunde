/**
 * TanStack Query hooks for the Shopping List API.
 * MUST stay in sync with backend/shopping/api.py
 */
import { API_BASE_URL, fetchWithCsrf, parseApiResponse } from '@/lib/api';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PaginatedShoppingListsSchema,
  ShoppingListSchema,
  ShoppingListDetailSchema,
  ShoppingListItemSchema,
  ShoppingListCollaboratorSchema,
  type ShoppingListDetail,
} from '@/schemas/shoppingList';

const API_BASE = `${API_BASE_URL}/api/shopping-lists`;

// --- Fetch helpers (ApiError with the German backend detail, never raw status texts) ---

async function fetchJson<T extends z.ZodTypeAny>(url: string, schema: T): Promise<z.output<T>> {
  return parseApiResponse(await fetch(url, { credentials: 'include' }), schema);
}

async function postJson<T extends z.ZodTypeAny>(
  url: string,
  body: unknown,
  schema: T,
): Promise<z.output<T>> {
  return parseApiResponse(await fetchWithCsrf(url, { method: 'POST', body: JSON.stringify(body) }), schema);
}

async function patchJson<T extends z.ZodTypeAny>(
  url: string,
  body: unknown,
  schema: T,
): Promise<z.output<T>> {
  return parseApiResponse(await fetchWithCsrf(url, { method: 'PATCH', body: JSON.stringify(body) }), schema);
}

async function deleteJson(url: string): Promise<void> {
  await parseApiResponse(await fetchWithCsrf(url, { method: 'DELETE' }));
}

// --- Shopping List CRUD hooks ---

export interface ShoppingListQuery {
  q?: string;
  sort?: 'newest' | 'oldest' | 'name_asc';
  mine?: boolean;
}

export function useShoppingLists(
  page = 1,
  pageSize = 20,
  query: ShoppingListQuery = {},
  options: { enabled?: boolean } = {},
) {
  const { q = '', sort = 'newest', mine = false } = query;
  return useQuery({
    enabled: options.enabled ?? true,
    // Keep the previous page visible while the next one loads (food-loading-states).
    placeholderData: keepPreviousData,
    queryKey: ['shopping-lists', page, pageSize, q, sort, mine] as const,
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort,
      });
      if (q) params.set('q', q);
      if (mine) params.set('mine', 'true');
      return fetchJson(`${API_BASE}/?${params.toString()}`, PaginatedShoppingListsSchema);
    },
  });
}

export function useShoppingList(id: number) {
  return useQuery({
    queryKey: ['shopping-list', id] as const,
    queryFn: () => fetchJson(`${API_BASE}/${id}/`, ShoppingListDetailSchema),
    enabled: id > 0,
  });
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string }) =>
      postJson(`${API_BASE}/`, payload, ShoppingListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

export function useUpdateShoppingList(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string }) =>
      patchJson(`${API_BASE}/${id}/`, payload, ShoppingListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-list', id] });
    },
  });
}

export function useDeleteShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${API_BASE}/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

// --- Item mutation hooks ---

export function useAddShoppingListItem(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      quantity_g?: number;
      unit?: string;
      retail_section_id?: number | null;
      ingredient_id?: number | null;
      sort_order?: number;
      note?: string;
      is_checked?: boolean;
    }) => postJson(`${API_BASE}/${listId}/items/`, payload, ShoppingListItemSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

export function useUpdateShoppingListItem(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      ...payload
    }: {
      itemId: number;
      name?: string;
      quantity_g?: number;
      unit?: string;
      retail_section_id?: number | null;
      is_checked?: boolean;
      sort_order?: number;
      note?: string;
    }) => patchJson(`${API_BASE}/${listId}/items/${itemId}/`, payload, ShoppingListItemSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

/** Removes the entry from the cached list right away and puts it back if the DELETE fails. */
export function useDeleteShoppingListItem(listId: number) {
  const queryClient = useQueryClient();
  const queryKey = ['shopping-list', listId] as const;
  return useMutation({
    mutationFn: (itemId: number) =>
      deleteJson(`${API_BASE}/${listId}/items/${itemId}/`),
    onMutate: async (itemId: number) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ShoppingListDetail>(queryKey);
      if (previous) {
        queryClient.setQueryData<ShoppingListDetail>(queryKey, {
          ...previous,
          items: previous.items.filter((item) => item.id !== itemId),
        });
      }
      return { previous };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

// --- Collaborator mutation hooks ---

export function useAddCollaborator(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { user_id: number; role?: string }) =>
      postJson(
        `${API_BASE}/${listId}/collaborators/`,
        payload,
        ShoppingListCollaboratorSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
    },
  });
}

export function useUpdateCollaborator(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collabId, role }: { collabId: number; role: string }) =>
      patchJson(
        `${API_BASE}/${listId}/collaborators/${collabId}/`,
        { role },
        ShoppingListCollaboratorSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
    },
  });
}

export function useRemoveCollaborator(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collabId: number) =>
      deleteJson(`${API_BASE}/${listId}/collaborators/${collabId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
    },
  });
}

// --- Export hooks ---

export function useCreateFromRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipeId,
      portions = 1,
      includeConsumables = true,
    }: {
      recipeId: number;
      portions?: number;
      includeConsumables?: boolean;
    }) =>
      postJson(
        `${API_BASE}/from-recipe/${recipeId}/`,
        { portions, include_consumables: includeConsumables },
        ShoppingListDetailSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

export function useCreateFromMealPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealPlanId,
      includeConsumables = true,
    }: {
      mealPlanId: number;
      includeConsumables?: boolean;
    }) =>
      postJson(
        `${API_BASE}/from-meal-plan/${mealPlanId}/?include_consumables=${includeConsumables}`,
        {},
        ShoppingListDetailSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

// --- REWE Export ---

import { ReweExportTokenResponseSchema } from '@/schemas/shoppingList';

export function useReweExportToken(listId: number) {
  return useMutation({
    mutationFn: () =>
      postJson(
        `${API_BASE}/${listId}/rewe-export-token/`,
        {},
        ReweExportTokenResponseSchema,
      ),
  });
}
