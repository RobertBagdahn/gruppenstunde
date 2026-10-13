/**
 * TanStack Query hooks for the material directory and material lists.
 * MUST stay in sync with backend/supply/api/materials.py and the
 * material-list endpoints in recipe/api/materials.py, planner/api/meal_plan.py
 * and shopping/api.py.
 */
import { API_BASE_URL, fetchWithCsrf, parseApiResponse } from '@/lib/api';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MaterialListResultSchema,
  MaterialSchema,
  PaginatedMaterialsSchema,
  type MaterialIn,
} from '@/schemas/supply';

const MATERIALS_BASE = `${API_BASE_URL}/api/supplies/materials`;

export interface MaterialFilters {
  q?: string;
  material_category?: string;
  is_consumable?: boolean;
  page?: number;
  page_size?: number;
}

function buildMaterialParams(filters: MaterialFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.material_category) params.set('material_category', filters.material_category);
  if (filters.is_consumable !== undefined) params.set('is_consumable', String(filters.is_consumable));
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  return params.toString();
}

async function getJson<S extends { parse(data: unknown): unknown }>(url: string, schema: S) {
  const res = await fetch(url, { credentials: 'include' });
  return parseApiResponse(res, schema as { parse(data: unknown): ReturnType<S['parse']> });
}

function invalidateMaterials(queryClient: ReturnType<typeof useQueryClient>): void {
  queryClient.invalidateQueries({ queryKey: ['materials'] });
  queryClient.invalidateQueries({ queryKey: ['material-search'] });
  queryClient.invalidateQueries({ queryKey: ['recipe-materials'] });
  queryClient.invalidateQueries({ queryKey: ['recipe'] });
}

// ==========================================================================
// Directory
// ==========================================================================

export function useMaterials(filters: MaterialFilters) {
  return useQuery({
    queryKey: ['materials', 'list', filters] as const,
    queryFn: () => getJson(`${MATERIALS_BASE}/?${buildMaterialParams(filters)}`, PaginatedMaterialsSchema),
    placeholderData: keepPreviousData,
  });
}

export function useMaterial(slug: string | undefined) {
  return useQuery({
    queryKey: ['materials', 'detail', slug] as const,
    queryFn: () => getJson(`${MATERIALS_BASE}/by-slug/${slug}/`, MaterialSchema),
    enabled: Boolean(slug),
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: MaterialIn) => {
      const res = await fetchWithCsrf(`${MATERIALS_BASE}/`, { method: 'POST', body: JSON.stringify(input) });
      return parseApiResponse(res, MaterialSchema);
    },
    onSuccess: () => invalidateMaterials(queryClient),
  });
}

export function useUpdateMaterial(materialId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<MaterialIn>) => {
      const res = await fetchWithCsrf(`${MATERIALS_BASE}/${materialId}/`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
      return parseApiResponse(res, MaterialSchema);
    },
    onSuccess: () => invalidateMaterials(queryClient),
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (materialId: number) => {
      const res = await fetchWithCsrf(`${MATERIALS_BASE}/${materialId}/`, { method: 'DELETE' });
      await parseApiResponse(res);
    },
    onSuccess: () => invalidateMaterials(queryClient),
  });
}

export function useMergeMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sourceId, targetId }: { sourceId: number; targetId: number }) => {
      const res = await fetchWithCsrf(`${MATERIALS_BASE}/${sourceId}/merge/`, {
        method: 'POST',
        body: JSON.stringify({ target_id: targetId }),
      });
      return parseApiResponse(res, MaterialSchema);
    },
    onSuccess: () => invalidateMaterials(queryClient),
  });
}

// ==========================================================================
// Material lists (unsaved views)
// ==========================================================================

export type MaterialListSource =
  | { kind: 'recipe'; id: number; servings: number }
  | { kind: 'meal-plan'; id: number }
  | { kind: 'shopping-list'; id: number };

export function materialListUrl(source: MaterialListSource): string {
  switch (source.kind) {
    case 'recipe':
      return `${API_BASE_URL}/api/recipes/${source.id}/material-list/?servings=${source.servings}`;
    case 'meal-plan':
      return `${API_BASE_URL}/api/meal-plans/${source.id}/material-list/`;
    case 'shopping-list':
      return `${API_BASE_URL}/api/shopping-lists/${source.id}/material-list/`;
  }
}

export function useMaterialList(source: MaterialListSource | null) {
  return useQuery({
    queryKey: ['material-list', source] as const,
    queryFn: () => getJson(materialListUrl(source as MaterialListSource), MaterialListResultSchema),
    enabled: source !== null,
  });
}
