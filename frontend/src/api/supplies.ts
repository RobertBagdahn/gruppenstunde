/**
 * TanStack Query hooks for the Supply API (Material + Ingredient).
 * MUST stay in sync with backend/supply/api.py
 *
 * Material hooks: /api/supplies/materials/
 * Ingredient hooks: /api/ingredients/ (slug-based)
 * MeasuringUnit hooks: /api/supplies/measuring-units/
 * NutritionalTag hooks: /api/supplies/nutritional-tags/
 * RetailSection hooks: /api/retail-sections/
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  MaterialSchema,
  MaterialListItemSchema,
  PaginatedMaterialsSchema,
  MeasuringUnitSchema,
  NutritionalTagSchema,
  RetailSectionSchema,
  IngredientDetailSchema,
  PaginatedIngredientSchema,
  PortionSchema,
  IngredientAliasSchema,
} from '@/schemas/supply';

const SUPPLY_BASE = '/api/supplies';
const INGREDIENT_BASE = '/api/ingredients';
const RETAIL_SECTION_BASE = '/api/retail-sections';

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
// Material Query Hooks
// ==========================================================================

export function useMaterials(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['materials', page, pageSize] as const,
    queryFn: () =>
      fetchJson(
        `${SUPPLY_BASE}/materials/?page=${page}&page_size=${pageSize}`,
        PaginatedMaterialsSchema,
      ),
  });
}

export function useMaterial(id: number) {
  return useQuery({
    queryKey: ['material', id] as const,
    queryFn: () => fetchJson(`${SUPPLY_BASE}/materials/${id}/`, MaterialSchema),
    enabled: id > 0,
  });
}

export function useMaterialBySlug(slug: string) {
  return useQuery({
    queryKey: ['material', 'slug', slug] as const,
    queryFn: () =>
      fetchJson(
        `${SUPPLY_BASE}/materials/by-slug/${encodeURIComponent(slug)}/`,
        MaterialSchema,
      ),
    enabled: slug.length > 0,
  });
}

export function useSupplySearch(q: string) {
  return useQuery({
    queryKey: ['supply-search', q] as const,
    queryFn: () =>
      fetchJson(
        `${SUPPLY_BASE}/materials/search/?q=${encodeURIComponent(q)}`,
        z.array(MaterialListItemSchema),
      ),
    enabled: q.length >= 2,
  });
}

// ==========================================================================
// Material Mutation Hooks
// ==========================================================================

export interface MaterialCreatePayload {
  name: string;
  description?: string;
  material_category?: string;
  is_consumable?: boolean;
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialCreatePayload) =>
      postJsonRaw(`${SUPPLY_BASE}/materials/`, payload, MaterialSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export interface MaterialUpdatePayload {
  name?: string;
  description?: string;
  material_category?: string;
  is_consumable?: boolean;
}

export function useUpdateMaterial(materialId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MaterialUpdatePayload) =>
      patchJsonRaw(`${SUPPLY_BASE}/materials/${materialId}/`, payload, MaterialSchema),
    onSuccess: (updated) => {
      queryClient.setQueryData(['material', materialId], updated);
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
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
}

export function useIngredients(filters: IngredientFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.name) params.set('name', filters.name);
  if (filters.retail_section) params.set('retail_section', String(filters.retail_section));
  if (filters.status) params.set('status', filters.status);

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
// Portion Hooks
// ==========================================================================

export function usePortions(slug: string) {
  return useQuery({
    queryKey: ['ingredient-portions', slug] as const,
    queryFn: () => fetchJson(`${INGREDIENT_BASE}/${slug}/portions/`, z.array(PortionSchema)),
    enabled: !!slug,
  });
}

export function useCreatePortion(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; quantity?: number; measuring_unit_id?: number; rank?: number; priority?: number; is_default?: boolean }) =>
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
// MeasuringUnit Hooks (from /api/supplies/measuring-units/)
// ==========================================================================

export function useMeasuringUnits() {
  return useQuery({
    queryKey: ['measuring-units'] as const,
    queryFn: () => fetchJson(`${SUPPLY_BASE}/measuring-units/`, z.array(MeasuringUnitSchema)),
    staleTime: 10 * 60 * 1000,
  });
}

// ==========================================================================
// NutritionalTag Hooks (from /api/supplies/nutritional-tags/)
// ==========================================================================

export function useNutritionalTags() {
  return useQuery({
    queryKey: ['nutritional-tags'] as const,
    queryFn: () => fetchJson(`${SUPPLY_BASE}/nutritional-tags/`, z.array(NutritionalTagSchema)),
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
