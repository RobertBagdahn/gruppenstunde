/**
 * TanStack Query hooks for the Supply API (Ingredient).
 * MUST stay in sync with backend/supply/api.py
 *
 * Ingredient hooks: /api/ingredients/ (slug-based)
 * NutritionalTag hooks: /api/supplies/nutritional-tags/
 * RetailSection hooks: /api/retail-sections/
 */
import { API_BASE_URL } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  IngredientDetailSchema,
  IngredientSimilarSchema,
  NutritionalTagSchema,
  RetailSectionSchema,
  PaginatedIngredientSchema,
  PortionSchema,
  IngredientAliasSchema,
} from '@/schemas/supply';
import { PaginatedRecipesSchema } from '@/schemas/recipe';

const INGREDIENT_BASE = `${API_BASE_URL}/api/ingredients`;
const RETAIL_SECTION_BASE = `${API_BASE_URL}/api/retail-sections`;

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

async function postJsonRaw<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
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

async function patchJsonRaw<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
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

async function deleteJsonRaw(url: string): Promise<void> {
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
// Ingredient Query Hooks (slug-based, /api/ingredients/)
// ==========================================================================

export interface IngredientFilters {
  page?: number;
  page_size?: number;
  name?: string;
  retail_section?: number;
  status?: string;
  origin?: string;
  sort?: string;
}

export function useIngredients(filters: IngredientFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.name) params.set('name', filters.name);
  if (filters.retail_section) params.set('retail_section', String(filters.retail_section));
  if (filters.status) params.set('status', filters.status);
  if (filters.origin && filters.origin !== 'all') params.set('origin', filters.origin);
  if (filters.sort) params.set('sort', filters.sort);

  const qs = params.toString();
  return useQuery({
    queryKey: ['ingredients', filters] as const,
    queryFn: () => fetchJson(`${INGREDIENT_BASE}/?${qs}`, PaginatedIngredientSchema),
  });
}

export function useIngredient(slug: string) {
  return useQuery({
    queryKey: ['ingredient', slug] as const,
    queryFn: () => fetchJson(`${INGREDIENT_BASE}/${slug}/`, IngredientDetailSchema),
    enabled: !!slug,
  });
}

export function useCreateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      postJsonRaw(`${INGREDIENT_BASE}/`, data, IngredientDetailSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}

export function useUpdateIngredient(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      patchJsonRaw(`${INGREDIENT_BASE}/${slug}/`, data, IngredientDetailSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useDeleteIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => deleteJsonRaw(`${INGREDIENT_BASE}/${slug}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}

// ==========================================================================
// Portion Mutation Hooks
// ==========================================================================

export function useCreatePortion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; quantity?: number; measuring_unit_id?: number; weight_g?: number; rank?: number; priority?: number; is_default?: boolean }) =>
      postJsonRaw(`${INGREDIENT_BASE}/${slug}/portions/`, data, PortionSchema),
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
      patchJsonRaw(`${INGREDIENT_BASE}/${slug}/portions/${portionId}/`, data, PortionSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-portions', slug] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useDeletePortion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (portionId: number) => deleteJsonRaw(`${INGREDIENT_BASE}/${slug}/portions/${portionId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-portions', slug] });
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
      postJsonRaw(`${INGREDIENT_BASE}/${slug}/aliases/`, data, IngredientAliasSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useDeleteAlias(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (aliasId: number) => deleteJsonRaw(`${INGREDIENT_BASE}/${slug}/aliases/${aliasId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

// ==========================================================================
// NutritionalTag Hooks (from /api/supplies/nutritional-tags/)
// ==========================================================================

export function useNutritionalTags() {
  return useQuery({
    queryKey: ['nutritional-tags'] as const,
    queryFn: () => fetchJson(`${API_BASE_URL}/api/nutritional-tags/`, z.array(NutritionalTagSchema)),
    staleTime: 10 * 60 * 1000,
  });
}

// ==========================================================================
// RetailSection Hooks (from /api/retail-sections/)
// ==========================================================================

export function useRetailSections() {
  return useQuery({
    queryKey: ['retail-sections'] as const,
    queryFn: () => fetchJson(`${RETAIL_SECTION_BASE}/`, z.array(RetailSectionSchema)),
    staleTime: 10 * 60 * 1000,
  });
}

// ==========================================================================
// MeasuringUnit Hooks (from /api/supplies/measuring-units/)
// ==========================================================================

const MeasuringUnitSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  quantity: z.number(),
  unit: z.string(),
});

export type MeasuringUnit = z.infer<typeof MeasuringUnitSchema>;

export function useMeasuringUnits() {
  return useQuery({
    queryKey: ['measuring-units'] as const,
    queryFn: () => fetchJson(`${API_BASE_URL}/api/supplies/measuring-units/`, z.array(MeasuringUnitSchema)),
    staleTime: 10 * 60 * 1000,
  });
}

// ==========================================================================
// UNIT CONVERSIONS
// ==========================================================================

const UNIT_CONVERSION_BASE = `${API_BASE_URL}/api/unit-conversions`;

export function useUnitConversions(params?: {
  from_unit?: number;
  to_unit?: number;
  ingredient?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params?.from_unit) searchParams.set('from_unit', String(params.from_unit));
  if (params?.to_unit) searchParams.set('to_unit', String(params.to_unit));
  if (params?.ingredient) searchParams.set('ingredient', String(params.ingredient));

  const qs = searchParams.toString();
  const url = `${UNIT_CONVERSION_BASE}/${qs ? `?${qs}` : ''}`;

  return useQuery({
    queryKey: ['unit-conversions', params] as const,
    queryFn: async () => {
      const { UnitConversionSchema } = await import('@/schemas/supply');
      return fetchJson(url, z.array(UnitConversionSchema));
    },
    staleTime: 10 * 60 * 1000,
  });
}

export function useConvertUnit() {
  return useMutation({
    mutationFn: async (params: {
      from_unit: number;
      to_unit: number;
      quantity: number;
      ingredient?: number;
    }) => {
      const searchParams = new URLSearchParams({
        from_unit: String(params.from_unit),
        to_unit: String(params.to_unit),
        quantity: String(params.quantity),
      });
      if (params.ingredient) searchParams.set('ingredient', String(params.ingredient));

      const { UnitConversionResultSchema } = await import('@/schemas/supply');
      return fetchJson(
        `${UNIT_CONVERSION_BASE}/convert/?${searchParams.toString()}`,
        UnitConversionResultSchema
      );
    },
  });
}

export function useAvailableConversions(
  items: Array<{ ingredient_id: number; from_unit_id: number; quantity: number }>,
  enabled = true,
) {
  return useQuery({
    queryKey: ['available-conversions', items] as const,
    queryFn: async () => {
      const { AvailableConversionBatchSchema } = await import('@/schemas/supply');
      return postJsonRaw(
        `${UNIT_CONVERSION_BASE}/available/batch/`,
        items,
        AvailableConversionBatchSchema,
      );
    },
    enabled: enabled && items.length > 0,
    staleTime: 10 * 60 * 1000,
  });
}

// ===========================================================================
// Ingredient Recipes (recipes that use this ingredient)
// ===========================================================================

export function useRecipesByIngredient(
  slug: string,
  filters: { page?: number; page_size?: number } = {},
) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  const qs = params.toString();

  return useQuery({
    queryKey: ['ingredient-recipes', slug, filters.page] as const,
    queryFn: () =>
      fetchJson(`${INGREDIENT_BASE}/${slug}/recipes/?${qs}`, PaginatedRecipesSchema),
    enabled: !!slug,
  });
}

// ===========================================================================
// AI Suggest
// ===========================================================================

export function useAiSuggestIngredientAll(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { IngredientSuggestAllSchema } = await import('@/schemas/supply');
      return postJsonRaw(
        `${INGREDIENT_BASE}/${slug}/ai-suggest-all/`,
        {},
        IngredientSuggestAllSchema
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

// ===========================================================================
// Similar Ingredients
// ===========================================================================

export function useSimilarIngredients(slug: string) {
  return useQuery({
    queryKey: ['ingredient-similar', slug] as const,
    queryFn: () => fetchJson(`${INGREDIENT_BASE}/${slug}/similar/`, z.array(IngredientSimilarSchema)),
    enabled: slug.length > 0,
  });
}

// ===========================================================================
// Statistics Stub Hooks (API endpoints not yet implemented)
// ===========================================================================

export function useIngredientRankings(_field: string) {
  return useQuery({
    queryKey: ['ingredient-rankings', _field] as const,
    queryFn: () => Promise.resolve([]),
    enabled: false,
  });
}

export function useIngredientDistributions(_field: string) {
  return useQuery({
    queryKey: ['ingredient-distributions', _field] as const,
    queryFn: () => Promise.resolve([]),
    enabled: false,
  });
}

export function useIngredientScatter(_xField: string, _yField: string) {
  return useQuery({
    queryKey: ['ingredient-scatter', _xField, _yField] as const,
    queryFn: () => Promise.resolve([]),
    enabled: false,
  });
}

export function useIngredientOutliers() {
  return useQuery({
    queryKey: ['ingredient-outliers'] as const,
    queryFn: () => Promise.resolve([]),
    enabled: false,
  });
}

export function useIngredientTagLists(_tag: string) {
  return useQuery({
    queryKey: ['ingredient-tag-lists', _tag] as const,
    queryFn: () => Promise.resolve({ items: [], total_count: 0 }),
    enabled: false,
  });
}

export function useIngredientScores(_scoreType: string) {
  return useQuery({
    queryKey: ['ingredient-scores', _scoreType] as const,
    queryFn: () => Promise.resolve({}),
    enabled: false,
  });
}
