/**
 * TanStack Query hooks for admin CRUD operations on master data.
 * Staff-only endpoints for RetailSection, NutritionalTag.
 */
import { API_BASE_URL } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  RetailSectionSchema,
  NutritionalTagSchema,
  EquipmentSchema,
  TagAdminSchema,
  TagDetailSchema,
  type RetailSectionIn,
  type NutritionalTagIn,
  type EquipmentIn,
  type TagAdminIn,
} from '@/schemas/supply';

const RETAIL_SECTION_BASE = `${API_BASE_URL}/api/retail-sections`;
const NUTRITIONAL_TAG_BASE = `${API_BASE_URL}/api/nutritional-tags`;
const EQUIPMENT_BASE = `${API_BASE_URL}/api/supply/equipment`;
const TAG_ADMIN_BASE = `${API_BASE_URL}/api/admin/tags`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
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
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `API error: ${res.status}`);
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
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `API error: ${res.status}`);
  }
}

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return schema.parse(data);
}

// ===========================================================================
// RetailSection Admin Hooks
// ===========================================================================

export function useAdminRetailSections() {
  return useQuery({
    queryKey: ['admin', 'retail-sections'],
    queryFn: () => fetchJson(`${RETAIL_SECTION_BASE}/`, z.array(RetailSectionSchema)),
  });
}

export function useCreateRetailSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RetailSectionIn) =>
      postJson(`${RETAIL_SECTION_BASE}/`, data, RetailSectionSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'retail-sections'] });
      qc.invalidateQueries({ queryKey: ['retail-sections'] });
    },
  });
}

export function useUpdateRetailSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RetailSectionIn> }) =>
      patchJson(`${RETAIL_SECTION_BASE}/${id}/`, data, RetailSectionSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'retail-sections'] });
      qc.invalidateQueries({ queryKey: ['retail-sections'] });
    },
  });
}

export function useDeleteRetailSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${RETAIL_SECTION_BASE}/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'retail-sections'] });
      qc.invalidateQueries({ queryKey: ['retail-sections'] });
    },
  });
}

// ===========================================================================
// NutritionalTag Admin Hooks
// ===========================================================================

export function useAdminNutritionalTags() {
  return useQuery({
    queryKey: ['admin', 'nutritional-tags'],
    queryFn: () => fetchJson(`${NUTRITIONAL_TAG_BASE}/`, z.array(NutritionalTagSchema)),
  });
}

export function useCreateNutritionalTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NutritionalTagIn) =>
      postJson(`${NUTRITIONAL_TAG_BASE}/`, data, NutritionalTagSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'nutritional-tags'] });
      qc.invalidateQueries({ queryKey: ['nutritional-tags'] });
    },
  });
}

export function useUpdateNutritionalTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NutritionalTagIn> }) =>
      patchJson(`${NUTRITIONAL_TAG_BASE}/${id}/`, data, NutritionalTagSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'nutritional-tags'] });
      qc.invalidateQueries({ queryKey: ['nutritional-tags'] });
    },
  });
}

export function useDeleteNutritionalTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${NUTRITIONAL_TAG_BASE}/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'nutritional-tags'] });
      qc.invalidateQueries({ queryKey: ['nutritional-tags'] });
    },
  });
}

// ===========================================================================
// Equipment Admin Hooks
// ===========================================================================

export function useAdminEquipment() {
  return useQuery({
    queryKey: ['admin', 'equipment'],
    queryFn: () => fetchJson(`${EQUIPMENT_BASE}/`, z.array(EquipmentSchema)),
  });
}

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EquipmentIn) =>
      postJson(`${EQUIPMENT_BASE}/`, data, EquipmentSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'equipment'] });
    },
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EquipmentIn> }) =>
      patchJson(`${EQUIPMENT_BASE}/${id}/`, data, EquipmentSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'equipment'] });
    },
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${EQUIPMENT_BASE}/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'equipment'] });
    },
  });
}

// ===========================================================================
// Tag Admin Hooks
// ===========================================================================

const PaginatedTagAdminSchema = z.object({
  items: z.array(TagAdminSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export function useAdminTags(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ['admin', 'tags', page, pageSize],
    queryFn: () =>
      fetchJson(`${TAG_ADMIN_BASE}/?page=${page}&page_size=${pageSize}`, PaginatedTagAdminSchema),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TagAdminIn) =>
      postJson(`${TAG_ADMIN_BASE}/`, data, TagAdminSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tags'] });
    },
  });
}

export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TagAdminIn> }) =>
      patchJson(`${TAG_ADMIN_BASE}/${id}/`, data, TagAdminSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tags'] });
    },
  });
}

export function useDeleteTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteJson(`${TAG_ADMIN_BASE}/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'tags'] });
    },
  });
}

export function useTagDetail(tagId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'tag-detail', tagId],
    queryFn: () => fetchJson(`${TAG_ADMIN_BASE}/${tagId}/detail/`, TagDetailSchema),
    enabled: !!tagId,
  });
}

// ==========================================================================
// Content Admin: Approval Queue (Recipes)
// ==========================================================================

const CONTENT_API_BASE = `${API_BASE_URL}/api/content/admin`;

const ApprovalQueueItemSchema = z.object({
  content_type: z.string(),
  object_id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  submitted_at: z.string(),
  author: z.string().nullable(),
});
export type ApprovalQueueItem = z.infer<typeof ApprovalQueueItemSchema>;

const PaginatedApprovalQueueSchema = z.object({
  items: z.array(ApprovalQueueItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedApprovalQueue = z.infer<typeof PaginatedApprovalQueueSchema>;

export function useApprovalQueue(page = 1, pageSize = 20) {
  return useQuery<PaginatedApprovalQueue>({
    queryKey: ['admin', 'approvals', page, pageSize],
    queryFn: async () => {
      const res = await fetch(
        `${CONTENT_API_BASE}/approvals/?page=${page}&page_size=${pageSize}`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return PaginatedApprovalQueueSchema.parse(await res.json());
    },
  });
}

const ApprovalActionResultSchema = z.object({
  success: z.boolean(),
  content_type: z.string(),
  object_id: z.number(),
  new_status: z.string(),
  message: z.string(),
});
export type ApprovalActionResult = z.infer<typeof ApprovalActionResultSchema>;

export function useApprovalAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      contentType: string;
      objectId: number;
      action: 'approve' | 'reject';
      reason?: string;
    }) => {
      const res = await fetch(
        `${CONTENT_API_BASE}/approvals/${params.contentType}/${params.objectId}/`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
          },
          body: JSON.stringify({ action: params.action, reason: params.reason ?? '' }),
        },
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return ApprovalActionResultSchema.parse(await res.json());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'approvals'] });
    },
  });
}
