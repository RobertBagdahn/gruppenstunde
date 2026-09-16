/**
 * TanStack Query hooks for portion repair findings.
 * MUST stay in sync with backend/supply/api/portion_repair.py
 */
import { API_BASE_URL } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PaginatedPortionRepairFindingSchema,
  PortionRepairApplyResponseSchema,
  PortionRepairRejectResponseSchema,
  type PortionRepairApplyResponse,
  type PortionRepairRejectResponse,
} from '@/schemas/portionRepair';

const BASE = `${API_BASE_URL}/api/admin/data-quality/portion-repair`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `API error: ${res.status}`);
  }
  return res.json();
}

async function postJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRFToken': getCsrfToken() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `API error: ${res.status}`);
  }
  return res.json();
}

export function usePortionRepairFindings(params: {
  page?: number;
  page_size?: number;
  status?: string;
} = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.status) searchParams.set('status', params.status);
  return useQuery({
    queryKey: ['portion-repair-findings', params] as const,
    queryFn: async () => {
      const data = await fetchJson(`${BASE}/?${searchParams}`);
      return PaginatedPortionRepairFindingSchema.parse(data);
    },
  });
}

export function usePortionRepairApply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (findingId: number): Promise<PortionRepairApplyResponse> => {
      const data = await postJson(`${BASE}/${findingId}/apply/`);
      return PortionRepairApplyResponseSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portion-repair-findings'] });
      queryClient.invalidateQueries({ queryKey: ['ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['ingredient'] });
    },
  });
}

export function usePortionRepairReject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (findingId: number): Promise<PortionRepairRejectResponse> => {
      const data = await postJson(`${BASE}/${findingId}/reject/`);
      return PortionRepairRejectResponseSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portion-repair-findings'] });
    },
  });
}
