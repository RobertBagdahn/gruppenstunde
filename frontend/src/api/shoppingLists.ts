/**
 * TanStack Query hooks for the Shopping List API.
 * MUST stay in sync with backend/shopping/api.py
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PaginatedShoppingListsSchema,
  ShoppingListSchema,
  ShoppingListDetailSchema,
  ShoppingListItemSchema,
  ShoppingListCollaboratorSchema,
} from '@/schemas/shoppingList';

const API_BASE = '/api/shopping-lists';

// --- Fetch helpers ---

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T extends z.ZodTypeAny>(
  url: string,
  schema: T,
): Promise<z.output<T>> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function postJson<T extends z.ZodTypeAny>(
  url: string,
  body: unknown,
  schema: T,
): Promise<z.output<T>> {
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
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `API error: ${res.status}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function patchJson<T extends z.ZodTypeAny>(
  url: string,
  body: unknown,
  schema: T,
): Promise<z.output<T>> {
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
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `API error: ${res.status}`);
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

// --- Shopping List CRUD hooks ---

export function useShoppingLists(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['shopping-lists', page, pageSize] as const,
    queryFn: () =>
      fetchJson(
        `${API_BASE}/?page=${page}&page_size=${pageSize}`,
        PaginatedShoppingListsSchema,
      ),
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

export function useDeleteShoppingListItem(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) =>
      deleteJson(`${API_BASE}/${listId}/items/${itemId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
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
      servings = 1,
    }: {
      recipeId: number;
      servings?: number;
    }) =>
      postJson(
        `${API_BASE}/from-recipe/${recipeId}/`,
        { servings },
        ShoppingListDetailSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

export function useCreateFromMealEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mealEventId: number) =>
      postJson(
        `${API_BASE}/from-meal-event/${mealEventId}/`,
        {},
        ShoppingListDetailSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}
