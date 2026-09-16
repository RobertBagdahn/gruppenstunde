/**
 * TanStack Query hooks for recipe materials (ContentMaterialItem links).
 * MUST stay in sync with backend/recipe/api/materials.py
 */
import { API_BASE_URL } from '@/lib/api';
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  RecipeMaterialSchema,
  AiMaterialSuggestionsSchema,
  type RecipeMaterial,
  type AiMaterialSuggestions,
} from '@/schemas/recipe';

const API_BASE = `${API_BASE_URL}/api/recipes`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

function extractErrorMessage(errBody: unknown): string {
  if (typeof errBody === 'string') {
    return errBody;
  }
  if (typeof errBody === 'object' && errBody !== null) {
    if ('detail' in errBody && typeof (errBody as Record<string, unknown>).detail === 'string') {
      return (errBody as Record<string, unknown>).detail as string;
    }
    if (Array.isArray(errBody)) {
      const messages = errBody
        .map((item) => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            const record = item as Record<string, unknown>;
            return record.msg || record.message || record.detail || record.error || '';
          }
          return '';
        })
        .filter((msg) => typeof msg === 'string' && msg.length > 0);
      if (messages.length > 0) {
        return messages.join(', ');
      }
    }
  }
  return 'API error';
}

async function fetchJson<T extends z.ZodTypeAny>(url: string, schema: T): Promise<z.output<T>> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(extractErrorMessage(errBody) || `API error: ${res.status}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function postJson<T extends z.ZodTypeAny>(url: string, body: unknown, schema: T): Promise<z.output<T>> {
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
    throw new Error(extractErrorMessage(errBody) || `API error: ${res.status}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function patchJson<T extends z.ZodTypeAny>(url: string, body: unknown, schema: T): Promise<z.output<T>> {
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
    throw new Error(extractErrorMessage(errBody) || `API error: ${res.status}`);
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

/**
 * Invalidate all TanStack Query keys that can become stale when recipe
 * materials change: the dedicated material list and the recipe detail.
 */
export function invalidateRecipeMaterialData(queryClient: QueryClient, recipeId: number): void {
  queryClient.invalidateQueries({ queryKey: ['recipe-materials', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe', 'slug'] });
}

// ==========================================================================
// Query hooks
// ==========================================================================

export function useRecipeMaterials(recipeId: number) {
  return useQuery({
    queryKey: ['recipe-materials', recipeId],
    queryFn: () => fetchJson(`${API_BASE}/${recipeId}/materials/`, z.array(RecipeMaterialSchema)),
    enabled: recipeId > 0,
  });
}

// ==========================================================================
// Mutation hooks
// ==========================================================================

export interface CreateRecipeMaterialInput {
  material_id: number;
  quantity: string;
}

export function useCreateRecipeMaterial(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRecipeMaterialInput): Promise<RecipeMaterial> =>
      postJson(`${API_BASE}/${recipeId}/materials/`, input, RecipeMaterialSchema),
    onSuccess: () => invalidateRecipeMaterialData(queryClient, recipeId),
  });
}

export interface UpdateRecipeMaterialInput {
  quantity?: string;
  sort_order?: number;
}

export function useUpdateRecipeMaterial(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { itemId: number; data: UpdateRecipeMaterialInput }): Promise<RecipeMaterial> =>
      patchJson(`${API_BASE}/${recipeId}/materials/${input.itemId}/`, input.data, RecipeMaterialSchema),
    onSuccess: () => invalidateRecipeMaterialData(queryClient, recipeId),
  });
}

export function useDeleteRecipeMaterial(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number): Promise<void> => deleteJson(`${API_BASE}/${recipeId}/materials/${itemId}/`),
    onSuccess: () => invalidateRecipeMaterialData(queryClient, recipeId),
  });
}

export function useReorderRecipeMaterials(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemIds: number[]): Promise<RecipeMaterial[]> =>
      postJson(`${API_BASE}/${recipeId}/materials/reorder/`, { item_ids: itemIds }, z.array(RecipeMaterialSchema)),
    onSuccess: () => invalidateRecipeMaterialData(queryClient, recipeId),
  });
}

export function useSuggestRecipeMaterials(recipeId: number) {
  return useMutation({
    mutationFn: (): Promise<AiMaterialSuggestions> =>
      postJson(`${API_BASE}/${recipeId}/ai-suggest-materials/`, {}, AiMaterialSuggestionsSchema),
  });
}

export interface ApplyRecipeMaterialInput {
  material_id: number;
  quantity: string;
}

export function useApplyRecipeMaterials(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inputs: ApplyRecipeMaterialInput[]): Promise<RecipeMaterial[]> =>
      postJson(`${API_BASE}/${recipeId}/ai-apply-materials/`, inputs, z.array(RecipeMaterialSchema)),
    onSuccess: () => invalidateRecipeMaterialData(queryClient, recipeId),
  });
}
