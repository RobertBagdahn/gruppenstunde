/**
 * TanStack Query hooks for the Ingredient Database API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PaginatedIngredientSchema,
  IngredientDetailSchema,
  PortionSchema,
  PriceSchema,
  IngredientAliasSchema,
  RetailSectionSchema,
  NutritionalTagSchema,
  RecipeCheckSchema,
  RecipeHintMatchSchema,
  NutriScoreDetailSchema,
  type PaginatedIngredient,
  type IngredientDetail,
  type Portion,
  type RetailSection,
  type NutritionalTag,
  type RecipeCheck,
  type RecipeHintMatch,
  type NutriScoreDetail,
} from '@/schemas/ingredient';

const API_BASE = '/api/ingredients';

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

// ==========================================================================
// Ingredient Hooks
// ==========================================================================

export interface IngredientFilters {
  page?: number;
  page_size?: number;
  name?: string;
  retail_section?: number;
  status?: string;
}

export function useIngredients(filters: IngredientFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.name) params.set('name', filters.name);
  if (filters.retail_section) params.set('retail_section', String(filters.retail_section));
  if (filters.status) params.set('status', filters.status);

  const qs = params.toString();
  return useQuery<PaginatedIngredient>({
    queryKey: ['ingredients', filters],
    queryFn: () => fetchJson(`${API_BASE}/?${qs}`, PaginatedIngredientSchema),
  });
}

export function useIngredient(slug: string) {
  return useQuery<IngredientDetail>({
    queryKey: ['ingredient', slug],
    queryFn: () => fetchJson(`${API_BASE}/${slug}/`, IngredientDetailSchema),
    enabled: !!slug,
  });
}

export function useCreateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      postJson(`${API_BASE}/`, data, IngredientDetailSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}

export function useUpdateIngredient(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      patchJson(`${API_BASE}/${slug}/`, data, IngredientDetailSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => deleteJson(`${API_BASE}/${slug}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}

// ==========================================================================
// Portion Hooks
// ==========================================================================

export function usePortions(slug: string) {
  return useQuery<Portion[]>({
    queryKey: ['ingredient-portions', slug],
    queryFn: () => fetchJson(`${API_BASE}/${slug}/portions/`, z.array(PortionSchema)),
    enabled: !!slug,
  });
}

export function useCreatePortion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; quantity?: number; measuring_unit_id?: number; rank?: number }) =>
      postJson(`${API_BASE}/${slug}/portions/`, data, PortionSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-portions', slug] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useUpdatePortion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ portionId, data }: { portionId: number; data: Record<string, unknown> }) =>
      patchJson(`${API_BASE}/${slug}/portions/${portionId}/`, data, PortionSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-portions', slug] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useDeletePortion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (portionId: number) => deleteJson(`${API_BASE}/${slug}/portions/${portionId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-portions', slug] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

// ==========================================================================
// Price Hooks
// ==========================================================================

export function useCreatePrice(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ portionId, data }: { portionId: number; data: { price_eur: number; quantity?: number; name?: string; retailer?: string; quality?: string } }) =>
      postJson(`${API_BASE}/${slug}/portions/${portionId}/prices/`, data, PriceSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useUpdatePrice(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ priceId, data }: { priceId: number; data: Record<string, unknown> }) =>
      patchJson(`${API_BASE}/${slug}/prices/${priceId}/`, data, PriceSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useDeletePrice(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (priceId: number) => deleteJson(`${API_BASE}/${slug}/prices/${priceId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

// ==========================================================================
// Alias Hooks
// ==========================================================================

export function useCreateAlias(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; rank?: number }) =>
      postJson(`${API_BASE}/${slug}/aliases/`, data, IngredientAliasSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useDeleteAlias(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (aliasId: number) => deleteJson(`${API_BASE}/${slug}/aliases/${aliasId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

// ==========================================================================
// Retail Section Hooks
// ==========================================================================

export function useRetailSections() {
  return useQuery<RetailSection[]>({
    queryKey: ['retail-sections'],
    queryFn: () => fetchJson('/api/retail-sections/', z.array(RetailSectionSchema)),
    staleTime: 10 * 60 * 1000, // 10 min
  });
}

// ==========================================================================
// Nutritional Tag Hooks
// ==========================================================================

export function useNutritionalTags() {
  return useQuery<NutritionalTag[]>({
    queryKey: ['nutritional-tags'],
    queryFn: () => fetchJson('/api/ideas/nutritional-tags/', z.array(NutritionalTagSchema)),
    staleTime: 10 * 60 * 1000,
  });
}

// ==========================================================================
// Recipe Analysis Hooks (now use /api/recipes/ endpoints)
// ==========================================================================

export function useRecipeChecks(recipeId: number) {
  return useQuery<RecipeCheck[]>({
    queryKey: ['recipe-checks', recipeId],
    queryFn: () => fetchJson(`/api/recipes/${recipeId}/recipe-checks/`, z.array(RecipeCheckSchema)),
    enabled: !!recipeId,
  });
}

export function useRecipeHints(recipeId: number, recipeObjective?: string) {
  const params = recipeObjective ? `?recipe_objective=${recipeObjective}` : '';
  return useQuery<RecipeHintMatch[]>({
    queryKey: ['recipe-hints', recipeId, recipeObjective],
    queryFn: () => fetchJson(`/api/recipes/${recipeId}/recipe-hints/${params}`, z.array(RecipeHintMatchSchema)),
    enabled: !!recipeId,
  });
}

export function useNutriScore(recipeId: number) {
  return useQuery<NutriScoreDetail>({
    queryKey: ['nutri-score', recipeId],
    queryFn: () => fetchJson(`/api/recipes/${recipeId}/nutri-score/`, NutriScoreDetailSchema),
    enabled: !!recipeId,
  });
}
