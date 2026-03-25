/**
 * TanStack Query hooks for the Materials API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MaterialNameDetailSchema,
  MaterialNameListSchema,
  MaterialUnitSchema,
  PaginatedMaterialsSchema,
  type MaterialNameDetail,
  type MaterialNameList,
  type MaterialUnit2,
  type PaginatedMaterials,
} from '@/schemas/idea';
import { z } from 'zod';

const API_BASE = '/api/materials';
const ADMIN_BASE = '/api/admin';

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

// --- Public ---

export function useMaterialBySlug(slug: string) {
  return useQuery<MaterialNameDetail>({
    queryKey: ['material', slug],
    queryFn: () => fetchJson(`${API_BASE}/by-slug/${encodeURIComponent(slug)}/`, MaterialNameDetailSchema),
    enabled: slug.length > 0,
  });
}

export function useMaterialList() {
  return useQuery<MaterialNameList[]>({
    queryKey: ['materials'],
    queryFn: () => fetchJson(`${API_BASE}/`, z.array(MaterialNameListSchema)),
  });
}

// --- Admin ---

export function useAdminMaterials(page: number = 1, pageSize: number = 20, search: string = '') {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (search) params.set('q', search);
  return useQuery<PaginatedMaterials>({
    queryKey: ['admin', 'materials', page, pageSize, search],
    queryFn: () => fetchJson(`${ADMIN_BASE}/materials/?${params}`, PaginatedMaterialsSchema),
  });
}

export function useAdminUnits() {
  return useQuery<MaterialUnit2[]>({
    queryKey: ['admin', 'units'],
    queryFn: () => fetchJson(`${ADMIN_BASE}/units/`, z.array(MaterialUnitSchema)),
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; description?: string; default_unit_id?: number | null }) => {
      const res = await fetch(`${ADMIN_BASE}/materials/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'materials'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: number; name: string; description?: string; default_unit_id?: number | null }) => {
      const res = await fetch(`${ADMIN_BASE}/materials/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'materials'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${ADMIN_BASE}/materials/${id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'materials'] });
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string }) => {
      const res = await fetch(`${ADMIN_BASE}/units/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'units'] });
    },
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const res = await fetch(`${ADMIN_BASE}/units/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'units'] });
    },
  });
}

export function useDeleteUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${ADMIN_BASE}/units/${id}/`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'units'] });
    },
  });
}
