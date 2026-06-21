/**
 * TanStack Query hooks for the Supply API (Material only).
 * MUST stay in sync with backend/supply/api.py
 *
 * Material hooks: /api/supplies/materials/
 * MeasuringUnit hooks: /api/supplies/measuring-units/
 * RetailSection hooks: /api/retail-sections/
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/api';
import {
  MaterialSchema,
  MaterialListItemSchema,
  PaginatedMaterialsSchema,
  MeasuringUnitSchema,
  RetailSectionSchema,
} from '@/schemas/supply';

const SUPPLY_BASE = `${API_BASE_URL}/api/supplies`;
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
// MeasuringUnit Hooks
// ==========================================================================

export function useMeasuringUnits() {
  return useQuery({
    queryKey: ['measuring-units'] as const,
    queryFn: () => fetchJson(`${SUPPLY_BASE}/measuring-units/`, z.array(MeasuringUnitSchema)),
    staleTime: 10 * 60 * 1000,
  });
}

// ==========================================================================
// RetailSection Hooks
// ==========================================================================

export function useRetailSections() {
  return useQuery({
    queryKey: ['retail-sections'] as const,
    queryFn: () => fetchJson(`${RETAIL_SECTION_BASE}/`, z.array(RetailSectionSchema)),
    staleTime: 10 * 60 * 1000,
  });
}
