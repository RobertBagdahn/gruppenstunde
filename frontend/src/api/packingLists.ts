/**
 * TanStack Query hooks for the Packing List API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PackingListSchema,
  PackingListSummarySchema,
  PackingItemSchema,
  PackingCategorySchema,
  type PackingList,
  type PackingListSummary,
} from '@/schemas/packingList';
import { z } from 'zod';

const API_BASE = '/api/packing-lists';

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
    mutationFn: (body: { title: string; description?: string; group_id?: number | null }) =>
      postJson(`${API_BASE}/`, body, PackingListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-lists'] });
    },
  });
}

export function useUpdatePackingList(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; description?: string; group_id?: number | null }) =>
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
    mutationFn: (body: { name: string; quantity?: string; description?: string }) =>
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
