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
  IngredientGroupSchema,
  IngredientSimilarSchema,
  NutritionalTagSchema,
  RetailSectionSchema,
  PaginatedIngredientSchema,
  PortionSchema,
  PackageSchema,
  type PortionSuggestion,
  type PackageSuggestion,
  IngredientAliasSchema,
  DistributionOutSchema,
  RankingsOutSchema,
  ScatterOutSchema,
  OutliersOutSchema,
  TagListOutSchema,
  ScoresOutSchema,
  ComparisonOutSchema,
} from '@/schemas/supply';
import { PaginatedRecipesSchema } from '@/schemas/recipe';

const INGREDIENT_BASE = `${API_BASE_URL}/api/ingredients`;
const RETAIL_SECTION_BASE = `${API_BASE_URL}/api/retail-sections`;
const INGREDIENT_GROUP_BASE = `${API_BASE_URL}/api/ingredient-groups`;

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

export class ApiDeleteError extends Error {
  status: number;
  recipes: Array<{ title: string }>;

  constructor(message: string, status: number, recipes: Array<{ title: string }> = []) {
    super(message);
    this.name = 'ApiDeleteError';
    this.status = status;
    this.recipes = recipes;
  }
}

async function deleteJsonRaw(url: string): Promise<void> {
  const res = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'X-CSRFToken': getCsrfToken() },
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new ApiDeleteError(
      errBody.detail || `API error: ${res.status}`,
      res.status,
      errBody.recipes || [],
    );
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

export interface IngredientSearchFilters {
  name?: string;
  retail_section?: number;
  nutritional_tag?: number;
  group?: string;
  ordering?: 'popularity' | 'price_asc' | 'price_desc' | 'nutri_class_asc' | 'energy_kcal_asc';
  page?: number;
  page_size?: number;
}

export function useIngredientSearch(filters: IngredientSearchFilters = {}) {
  const params = new URLSearchParams();
  if (filters.name) params.set('name', filters.name);
  if (filters.retail_section) params.set('retail_section', String(filters.retail_section));
  if (filters.nutritional_tag) params.set('nutritional_tag', String(filters.nutritional_tag));
  if (filters.group) params.set('group', filters.group);
  if (filters.ordering) params.set('ordering', filters.ordering);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));

  const qs = params.toString();
  return useQuery({
    queryKey: ['ingredient-search', filters] as const,
    queryFn: () => fetchJson(`${INGREDIENT_BASE}/?${qs}`, PaginatedIngredientSchema),
    staleTime: 30_000,
  });
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
// Portion Query Hooks
// ==========================================================================

/**
 * Fetch all portions for an ingredient by slug.
 * Use this instead of raw fetch('/api/ingredients/{slug}/portions/').
 */
export function useIngredientPortions(slug: string) {
  return useQuery({
    queryKey: ['ingredient-portions', slug] as const,
    queryFn: () => fetchJson(`${INGREDIENT_BASE}/${slug}/portions/`, z.array(PortionSchema)),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

// ==========================================================================
// Portion Mutation Hooks
// ==========================================================================

export function useCreatePortion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; quantity?: number; measuring_unit_id?: number; weight_g?: number; rank?: number }) =>
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

export function useMovePortion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ portionId, direction }: { portionId: number; direction: 'up' | 'down' }) =>
      postJsonRaw(
        `${INGREDIENT_BASE}/${slug}/portions/${portionId}/move/?direction=${direction}`,
        {},
        z.array(PortionSchema),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-portions', slug] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useReorderPortions(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orders: Array<{ id: number; rank: number }>) =>
      postJsonRaw(
        `${INGREDIENT_BASE}/${slug}/portions/reorder/`,
        { orders },
        z.array(PortionSchema),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-portions', slug] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

/**
 * Atomically apply selected AI suggestions for portions AND packages (POST /{slug}/ai-apply/).
 */
export function useApplyAiSuggestions(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { replace_all: boolean; portions: PortionSuggestion[]; packages: PackageSuggestion[] }) =>
      postJsonRaw(`${INGREDIENT_BASE}/${slug}/ai-apply/`, data, z.object({
        portions: z.array(PortionSchema),
        packages: z.array(PackageSchema),
      })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-portions', slug] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

// ==========================================================================
// Package Hooks
// ==========================================================================

export function useIngredientPackages(slug: string) {
  return useQuery({
    queryKey: ['ingredient-packages', slug] as const,
    queryFn: () => fetchJson(`${INGREDIENT_BASE}/${slug}/packages/`, z.array(PackageSchema)),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export function useCreatePackage(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; weight_g?: number | null; rank?: number }) =>
      postJsonRaw(`${INGREDIENT_BASE}/${slug}/packages/`, data, PackageSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-packages', slug] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useUpdatePackage(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ packageId, data }: { packageId: number; data: Record<string, unknown> }) =>
      patchJsonRaw(`${INGREDIENT_BASE}/${slug}/packages/${packageId}/`, data, PackageSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-packages', slug] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useDeletePackage(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (packageId: number) => deleteJsonRaw(`${INGREDIENT_BASE}/${slug}/packages/${packageId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-packages', slug] });
      queryClient.invalidateQueries({ queryKey: ['ingredient', slug] });
    },
  });
}

export function useReorderPackages(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orders: Array<{ id: number; rank: number }>) =>
      postJsonRaw(
        `${INGREDIENT_BASE}/${slug}/packages/reorder/`,
        { orders },
        z.array(PackageSchema),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredient-packages', slug] });
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
    mutationFn: (data: { name: string; rank?: number; is_generic?: boolean }) =>
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
// Generic Terms (for "too generic" name warnings)
// ==========================================================================

export function useGenericTerms() {
  return useQuery({
    queryKey: ['generic-terms'],
    queryFn: () => fetchJson(`${INGREDIENT_BASE}/generic-terms/`, z.array(z.string())),
    staleTime: 5 * 60 * 1000,
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

export function useIngredientGroups() {
  return useQuery({
    queryKey: ['ingredient-groups'] as const,
    queryFn: () => fetchJson(`${INGREDIENT_GROUP_BASE}/`, z.array(IngredientGroupSchema)),
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
// UNIT CONVERSIONS — moved to @/api/unitConversions
// Import useUnitConversions, useConvertUnit, useAvailableConversions from
// @/api/unitConversions instead.
// ===========================================================================

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

export function useAiCreateIngredient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      return postJsonRaw(
        `${INGREDIENT_BASE}/ai-create/`,
        { name },
        IngredientDetailSchema
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
    },
  });
}

export function useIngredientImportUrl() {
  return useMutation({
    mutationFn: async (url: string) => {
      const { IngredientImportUrlOutSchema } = await import('@/schemas/supply');
      return postJsonRaw(
        `${INGREDIENT_BASE}/import-from-url/`,
        { url },
        IngredientImportUrlOutSchema
      );
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
// Statistics Hooks
// ===========================================================================

const INGREDIENT_STATISTICS_BASE = `${API_BASE_URL}/api/ingredient-statistics`;

export function useIngredientDistributions(
  field: string,
  options?: { retailSectionId?: number | null; enabled?: boolean },
) {
  const params = new URLSearchParams({ field });
  if (options?.retailSectionId) {
    params.set('retail_section_id', String(options.retailSectionId));
  }
  return useQuery({
    queryKey: ['ingredient-distributions', field, options?.retailSectionId ?? null] as const,
    queryFn: () =>
      fetchJson(`${INGREDIENT_STATISTICS_BASE}/distributions/?${params}`, DistributionOutSchema),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIngredientRankings(
  field: string,
  options?: { retailSectionId?: number | null; tag?: string; enabled?: boolean },
) {
  const params = new URLSearchParams({ field });
  if (options?.retailSectionId) params.set('retail_section_id', String(options.retailSectionId));
  if (options?.tag) params.set('tag', options.tag);
  return useQuery({
    queryKey: ['ingredient-rankings', field, options?.retailSectionId ?? null, options?.tag ?? null] as const,
    queryFn: () => fetchJson(`${INGREDIENT_STATISTICS_BASE}/rankings/?${params}`, RankingsOutSchema),
    enabled: options?.enabled !== false && !!field,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIngredientScatter(
  xField: string,
  yField: string,
  options?: { retailSectionId?: number | null; enabled?: boolean },
) {
  const params = new URLSearchParams({ x_field: xField, y_field: yField });
  if (options?.retailSectionId) params.set('retail_section_id', String(options.retailSectionId));
  return useQuery({
    queryKey: ['ingredient-scatter', xField, yField, options?.retailSectionId ?? null] as const,
    queryFn: () => fetchJson(`${INGREDIENT_STATISTICS_BASE}/scatter/?${params}`, ScatterOutSchema),
    enabled: options?.enabled !== false && !!xField && !!yField,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIngredientOutliers(
  options?: { field?: string; retailSectionId?: number | null; enabled?: boolean },
) {
  const params = new URLSearchParams();
  if (options?.field) params.set('field', options.field);
  if (options?.retailSectionId) params.set('retail_section_id', String(options.retailSectionId));
  const qs = params.toString();
  return useQuery({
    queryKey: ['ingredient-outliers', options?.field ?? null, options?.retailSectionId ?? null] as const,
    queryFn: () => fetchJson(`${INGREDIENT_STATISTICS_BASE}/outliers/${qs ? `?${qs}` : ''}`, OutliersOutSchema),
    enabled: options?.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIngredientTagLists(
  tag: string,
  options?: { sortBy?: string; retailSectionId?: number | null; enabled?: boolean },
) {
  const params = new URLSearchParams({ tag });
  if (options?.sortBy) params.set('sort_by', options.sortBy);
  if (options?.retailSectionId) params.set('retail_section_id', String(options.retailSectionId));
  return useQuery({
    queryKey: ['ingredient-tag-lists', tag, options?.sortBy ?? null, options?.retailSectionId ?? null] as const,
    queryFn: () => fetchJson(`${INGREDIENT_STATISTICS_BASE}/tag-lists/?${params}`, TagListOutSchema),
    enabled: options?.enabled !== false && !!tag,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIngredientScores(
  scoreType: string,
  options?: { retailSectionId?: number | null; enabled?: boolean },
) {
  const params = new URLSearchParams({ score_type: scoreType });
  if (options?.retailSectionId) params.set('retail_section_id', String(options.retailSectionId));
  return useQuery({
    queryKey: ['ingredient-scores', scoreType, options?.retailSectionId ?? null] as const,
    queryFn: () => fetchJson(`${INGREDIENT_STATISTICS_BASE}/scores/?${params}`, ScoresOutSchema),
    enabled: options?.enabled !== false && !!scoreType,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIngredientComparison(
  groupBy: string,
  metric: string,
  options?: { retailSectionId?: number | null; enabled?: boolean },
) {
  const params = new URLSearchParams({ group_by: groupBy, metric });
  if (options?.retailSectionId) params.set('retail_section_id', String(options.retailSectionId));
  return useQuery({
    queryKey: ['ingredient-comparison', groupBy, metric, options?.retailSectionId ?? null] as const,
    queryFn: () => fetchJson(`${INGREDIENT_STATISTICS_BASE}/comparison/?${params}`, ComparisonOutSchema),
    enabled: options?.enabled !== false && !!groupBy && !!metric,
    staleTime: 5 * 60 * 1000,
  });
}
