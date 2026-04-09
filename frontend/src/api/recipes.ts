/**
 * TanStack Query hooks for the Recipe API.
 * MUST stay in sync with backend/recipe/api.py
 *
 * Recipe now extends Content. Comments use ContentCommentSchema (threaded).
 * Emotions are generic ContentEmotions (toggle returns counts dict).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PaginatedRecipesSchema,
  RecipeDetailSchema,
  RecipeItemSchema,
  RecipeCheckSchema,
  RecipeHintMatchSchema,
  NutriScoreDetailSchema,
  RecipeNutritionBreakdownSchema,
  type RecipeFilter,
} from '@/schemas/recipe';
import { ContentCommentSchema } from '@/schemas/content';

const API_BASE = '/api/recipes';

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
    throw new Error(`API error: ${res.status} ${res.statusText}`);
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

function buildFilterParams(filters: Partial<RecipeFilter>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.recipe_type) params.set('recipe_type', filters.recipe_type);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.costs_rating) params.set('costs_rating', filters.costs_rating);
  if (filters.execution_time) params.set('execution_time', filters.execution_time);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.scout_level_ids?.length) {
    filters.scout_level_ids.forEach((id) => params.append('scout_level_ids', String(id)));
  }
  if (filters.tag_slugs?.length) {
    filters.tag_slugs.forEach((slug) => params.append('tag_slugs', slug));
  }
  return params.toString();
}

// ==========================================================================
// Recipe Query Hooks
// ==========================================================================

export function useRecipes(filters: Partial<RecipeFilter> = {}) {
  const queryString = buildFilterParams(filters);
  return useQuery({
    queryKey: ['recipes', filters] as const,
    queryFn: () => fetchJson(`${API_BASE}/?${queryString}`, PaginatedRecipesSchema),
  });
}

export function useRecipe(id: number) {
  return useQuery({
    queryKey: ['recipe', id] as const,
    queryFn: () => fetchJson(`${API_BASE}/${id}/`, RecipeDetailSchema),
    enabled: id > 0,
  });
}

export function useRecipeBySlug(slug: string) {
  return useQuery({
    queryKey: ['recipe', 'slug', slug] as const,
    queryFn: () => fetchJson(`${API_BASE}/by-slug/${encodeURIComponent(slug)}/`, RecipeDetailSchema),
    enabled: slug.length > 0,
  });
}

// ==========================================================================
// Recipe Mutation Hooks
// ==========================================================================

export interface RecipeCreatePayload {
  title: string;
  summary?: string;
  summary_long?: string;
  description?: string;
  recipe_type?: string;
  servings?: number;
  costs_rating?: string;
  execution_time?: string;
  preparation_time?: string;
  difficulty?: string;
  scout_level_ids?: number[];
  tag_ids?: number[];
  nutritional_tag_ids?: number[];
  recipe_items?: Array<{
    portion_id?: number | null;
    ingredient_id?: number | null;
    quantity?: number;
    measuring_unit_id?: number | null;
    sort_order?: number;
    note?: string;
    quantity_type?: string;
  }>;
  website?: string;
  form_loaded_at?: number;
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecipeCreatePayload) => postJson(`${API_BASE}/`, payload, RecipeDetailSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export interface RecipeUpdatePayload {
  title?: string;
  summary?: string;
  summary_long?: string;
  description?: string;
  recipe_type?: string;
  servings?: number;
  costs_rating?: string;
  execution_time?: string;
  preparation_time?: string;
  difficulty?: string;
  status?: string;
  scout_level_ids?: number[];
  tag_ids?: number[];
  nutritional_tag_ids?: number[];
  recipe_items?: Array<{
    portion_id?: number | null;
    ingredient_id?: number | null;
    quantity?: number;
    measuring_unit_id?: number | null;
    sort_order?: number;
    note?: string;
    quantity_type?: string;
  }>;
}

export function useUpdateRecipe(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: RecipeUpdatePayload) => patchJson(`${API_BASE}/${recipeId}/`, payload, RecipeDetailSchema),
    onSuccess: (updatedRecipe) => {
      queryClient.setQueryData(['recipe', recipeId], updatedRecipe);
      queryClient.setQueryData(['recipe', 'slug', updatedRecipe.slug], updatedRecipe);
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (recipeId) => deleteJson(`${API_BASE}/${recipeId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

// ==========================================================================
// Recipe Items
// ==========================================================================

export function useRecipeItems(recipeId: number) {
  return useQuery({
    queryKey: ['recipe-items', recipeId] as const,
    queryFn: () => fetchJson(`${API_BASE}/${recipeId}/recipe-items/`, z.array(RecipeItemSchema)),
    enabled: recipeId > 0,
  });
}

export function useCreateRecipeItem(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      portion_id?: number | null;
      ingredient_id?: number | null;
      quantity?: number;
      measuring_unit_id?: number | null;
      sort_order?: number;
      note?: string;
      quantity_type?: string;
    }) => postJson(`${API_BASE}/${recipeId}/recipe-items/`, data, RecipeItemSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-items', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
    },
  });
}

export function useUpdateRecipeItem(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: Record<string, unknown> }) =>
      patchJson(`${API_BASE}/${recipeId}/recipe-items/${itemId}/`, data, RecipeItemSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-items', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
    },
  });
}

export function useDeleteRecipeItem(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => deleteJson(`${API_BASE}/${recipeId}/recipe-items/${itemId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-items', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
    },
  });
}

// ==========================================================================
// Comments (now using ContentComment — threaded)
// ==========================================================================

export function useRecipeComments(recipeId: number) {
  return useQuery({
    queryKey: ['recipe-comments', recipeId] as const,
    queryFn: () => fetchJson(`${API_BASE}/${recipeId}/comments/`, z.array(ContentCommentSchema)),
    enabled: recipeId > 0,
  });
}

export function useCreateRecipeComment(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { text: string; author_name?: string; parent_id?: number | null }) =>
      postJson(`${API_BASE}/${recipeId}/comments/`, body, ContentCommentSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-comments', recipeId] });
    },
  });
}

// ==========================================================================
// Emotions (toggle — returns emotion counts dict)
// ==========================================================================

export function useRecipeEmotion(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { emotion_type: string }) => {
      const res = await fetch(`${API_BASE}/${recipeId}/emotions/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      if (res.status === 204) return null;
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe', 'slug'] });
    },
  });
}

// ==========================================================================
// Recipe Analysis (Checks, Hints, Nutri-Score)
// ==========================================================================

export function useRecipeChecks(recipeId: number) {
  return useQuery({
    queryKey: ['recipe-checks', recipeId] as const,
    queryFn: () => fetchJson(`${API_BASE}/${recipeId}/recipe-checks/`, z.array(RecipeCheckSchema)),
    enabled: recipeId > 0,
  });
}

export function useRecipeHints(recipeId: number, recipeObjective?: string) {
  const params = recipeObjective ? `?recipe_objective=${recipeObjective}` : '';
  return useQuery({
    queryKey: ['recipe-hints', recipeId, recipeObjective] as const,
    queryFn: () => fetchJson(`${API_BASE}/${recipeId}/recipe-hints/${params}`, z.array(RecipeHintMatchSchema)),
    enabled: recipeId > 0,
  });
}

export function useRecipeNutriScore(recipeId: number) {
  return useQuery({
    queryKey: ['recipe-nutri-score', recipeId] as const,
    queryFn: () => fetchJson(`${API_BASE}/${recipeId}/nutri-score/`, NutriScoreDetailSchema),
    enabled: recipeId > 0,
  });
}

export function useRecipeNutritionBreakdown(recipeId: number) {
  return useQuery({
    queryKey: ['recipe-nutrition-breakdown', recipeId] as const,
    queryFn: () =>
      fetchJson(`${API_BASE}/${recipeId}/nutrition-breakdown/`, RecipeNutritionBreakdownSchema),
    enabled: recipeId > 0,
  });
}

// ==========================================================================
// Image Upload
// ==========================================================================

export function useUploadRecipeImage(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch(`${API_BASE}/${recipeId}/image/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: formData,
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json() as Promise<{ image_url: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe', 'slug'] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}
