/**
 * TanStack Query hooks for the Recipe API.
 * MUST stay in sync with backend/recipe/api.py
 *
 * Recipe now extends Content. Comments use ContentCommentSchema (threaded).
 * Emotions are generic ContentEmotions (toggle returns counts dict).
 */
import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PaginatedRecipesSchema,
  RecipeDetailSchema,
  RecipeItemSchema,
  NutriScoreDetailSchema,
  RecipeNutritionBreakdownSchema,
  ImprovementListSchema,
  LlmSuggestionSchema,
  RecipeFolderSchema,
  AiIngredientSuggestionSchema,
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
  if (filters.origin) params.set('origin', filters.origin);
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
// Invalidation Helper
// ==========================================================================

/**
 * Invalidate all TanStack Query keys that can become stale when a Recipe
 * or its RecipeItems change. All Recipe/RecipeItem mutations should call
 * this in their onSuccess callback.
 */
export function invalidateRecipeData(queryClient: QueryClient, recipeId: number): void {
  queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe', 'slug'] });
  queryClient.invalidateQueries({ queryKey: ['recipe-items', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe-hints', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe-nutri-score', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe-nutrition-breakdown', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipe-nutri-improvements', recipeId] });
  queryClient.invalidateQueries({ queryKey: ['recipes'] });
  queryClient.invalidateQueries({ queryKey: ['my-recipes'] });
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
    onSuccess: (newRecipe) => {
      invalidateRecipeData(queryClient, newRecipe.id);
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
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: (recipeId) => deleteJson(`${API_BASE}/${recipeId}/`),
    onSuccess: (_data, recipeId) => {
      invalidateRecipeData(queryClient, recipeId);
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
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

export function useUpdateRecipeItem(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: Record<string, unknown> }) =>
      patchJson(`${API_BASE}/${recipeId}/recipe-items/${itemId}/`, data, RecipeItemSchema),
    onSuccess: () => {
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

export function useDeleteRecipeItem(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: number) => deleteJson(`${API_BASE}/${recipeId}/recipe-items/${itemId}/`),
    onSuccess: () => {
      invalidateRecipeData(queryClient, recipeId);
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
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

// ===========================================================================
// Recipe Folders
// ===========================================================================

const FOLDER_BASE = '/api/recipe-folders';

export function useRecipeFolders() {
  return useQuery({
    queryKey: ['recipe-folders'] as const,
    queryFn: async () => {
      const res = await fetch(`${FOLDER_BASE}/`, { credentials: 'include' });
      if (!res.ok) throw new Error('Ordner laden fehlgeschlagen');
      return z.array(RecipeFolderSchema).parse(await res.json());
    },
  });
}

export function useCreateRecipeFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; parent_id?: number | null }) => {
      const res = await fetch(`${FOLDER_BASE}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Ordner erstellen fehlgeschlagen');
      return RecipeFolderSchema.parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-folders'] });
    },
  });
}

export function useDeleteRecipeFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: number) => {
      const res = await fetch(`${FOLDER_BASE}/${folderId}/`, {
        method: 'DELETE',
        headers: { 'X-CSRFToken': getCsrfToken() },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Ordner löschen fehlgeschlagen');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-folders'] });
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
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

// ==========================================================================
// Recipe Analysis (Hints, Nutri-Score)
// ==========================================================================

export function useRecipeImprovements(recipeId: number) {
  return useQuery({
    queryKey: ['recipe-improvements', recipeId] as const,
    queryFn: () => fetchJson(`${API_BASE}/${recipeId}/improvements/`, ImprovementListSchema),
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
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

export function useDeleteRecipeImage(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/${recipeId}/image/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json() as Promise<{ image_url: null }>;
    },
    onSuccess: () => {
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

export function useSetRecipeImageFromUrl(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await fetch(`${API_BASE}/${recipeId}/image-from-url/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json() as Promise<{ image_url: string }>;
    },
    onSuccess: () => {
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

// ==========================================================================
// LLM Suggestions
// ==========================================================================

export function useLlmSuggestions(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (objective: string) =>
      postJson(
        `${API_BASE}/${recipeId}/suggestions/`,
        { objective },
        z.array(LlmSuggestionSchema),
      ),
    onSuccess: () => {
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

// ==========================================================================
// Personal Recipes (Fork, My Recipes, Visibility)
// ==========================================================================

export function useForkRecipe(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => postJson(`${API_BASE}/${recipeId}/fork/`, {}, RecipeDetailSchema),
    onSuccess: (forkedRecipe) => {
      invalidateRecipeData(queryClient, forkedRecipe.id);
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

/** Fork a recipe and immediately apply modifications (items + servings) to the fork */
export function useForkAndSaveRecipe(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { servings?: number | null; recipe_items: RecipeUpdatePayload['recipe_items'] }) => {
      const forked = await postJson(`${API_BASE}/${recipeId}/fork/`, {}, RecipeDetailSchema);
      const updated = await patchJson(`${API_BASE}/${forked.id}/`, payload, RecipeDetailSchema);
      return updated;
    },
    onSuccess: (updatedRecipe) => {
      invalidateRecipeData(queryClient, updatedRecipe.id);
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

export function useMyRecipes(filters: Partial<RecipeFilter> = {}) {
  const queryString = buildFilterParams(filters);
  return useQuery({
    queryKey: ['my-recipes', filters] as const,
    queryFn: () => fetchJson(`${API_BASE}/my-recipes/?${queryString}`, PaginatedRecipesSchema),
  });
}

export function useUpdateVisibility(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visibility: string) =>
      patchJson(
        `${API_BASE}/${recipeId}/visibility/`,
        { visibility },
        z.object({ success: z.boolean(), visibility: z.string(), status: z.string() }),
      ),
    onSuccess: () => {
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

// ==========================================================================
// AI Ingredient Suggestions
// ==========================================================================

export function useAiSuggestIngredients(recipeId: number) {
  return useMutation({
    mutationFn: () =>
      postJson(
        `${API_BASE}/${recipeId}/ai-suggest-ingredients/`,
        {},
        z.array(AiIngredientSuggestionSchema),
      ),
  });
}

export function useAiApplyIngredients(recipeId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{
      ingredient_id: number;
      portion_id: number | null;
      quantity: number;
      measuring_unit_id: number | null;
    }>) =>
      postJson(
        `${API_BASE}/${recipeId}/ai-apply-ingredients/`,
        items,
        z.array(RecipeItemSchema),
      ),
    onSuccess: () => {
      invalidateRecipeData(queryClient, recipeId);
    },
  });
}

// ==========================================================================
// AI Recipe Suggest & Create
// ==========================================================================

export function useAiSuggestRecipeAll(recipeId: number) {
  return useMutation({
    mutationFn: async () => {
      const { RecipeSuggestAllSchema } = await import('@/schemas/recipe');
      return postJson(
        `${API_BASE}/${recipeId}/ai-suggest-all/`,
        {},
        RecipeSuggestAllSchema,
      );
    },
  });
}

export function useAiCreateRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { title: string; description?: string }) => {
      return postJson(
        `${API_BASE}/ai-create/`,
        params,
        RecipeDetailSchema,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}
