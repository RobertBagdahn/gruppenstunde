/**
 * TanStack Query hooks for admin CRUD operations on master data.
 * Staff-only endpoints for RetailSection, NutritionalTag, HealthRule, RecipeHint.
 */
import { API_BASE_URL } from '@/lib/api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  RetailSectionSchema,
  NutritionalTagSchema,
  RecipeHintSchema,
  type RetailSectionIn,
  type NutritionalTagIn,
  type RecipeHintIn,
} from '@/schemas/supply';
import { HealthRuleSchema, type HealthRuleIn } from '@/schemas/cockpit';

const RETAIL_SECTION_BASE = `${API_BASE_URL}/api/retail-sections`;
const NUTRITIONAL_TAG_BASE = `${API_BASE_URL}/api/nutritional-tags`;
const HEALTH_RULE_BASE = `${API_BASE_URL}/api/health-rules`;
const RECIPE_HINT_BASE = `${API_BASE_URL}/api/recipe-hints`;

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
// HealthRule Admin Hooks
// ===========================================================================

export function useAdminHealthRules() {
  return useQuery({
    queryKey: ['admin', 'health-rules'],
    queryFn: () => fetchJson(`${HEALTH_RULE_BASE}/`, z.array(HealthRuleSchema)),
  });
}

export function useCreateHealthRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: HealthRuleIn) =>
      postJson(`${HEALTH_RULE_BASE}/`, data, HealthRuleSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'health-rules'] });
      qc.invalidateQueries({ queryKey: ['health-rules'] });
    },
  });
}

export function useUpdateHealthRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<HealthRuleIn> }) =>
      patchJson(`${HEALTH_RULE_BASE}/${id}/`, data, HealthRuleSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'health-rules'] });
      qc.invalidateQueries({ queryKey: ['health-rules'] });
    },
  });
}

export function useDeleteHealthRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${HEALTH_RULE_BASE}/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'health-rules'] });
      qc.invalidateQueries({ queryKey: ['health-rules'] });
    },
  });
}

// ===========================================================================
// RecipeHint Admin Hooks
// ===========================================================================

const PaginatedRecipeHintsSchema = z.object({
  items: z.array(RecipeHintSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

export function useAdminRecipeHints(page = 1, pageSize = 50) {
  return useQuery({
    queryKey: ['admin', 'recipe-hints', page, pageSize],
    queryFn: () =>
      fetchJson(
        `${RECIPE_HINT_BASE}/?page=${page}&page_size=${pageSize}`,
        PaginatedRecipeHintsSchema,
      ),
  });
}

export function useCreateRecipeHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RecipeHintIn) =>
      postJson(`${RECIPE_HINT_BASE}/`, data, RecipeHintSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'recipe-hints'] });
    },
  });
}

export function useUpdateRecipeHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<RecipeHintIn> }) =>
      patchJson(`${RECIPE_HINT_BASE}/${id}/`, data, RecipeHintSchema),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'recipe-hints'] });
    },
  });
}

export function useDeleteRecipeHint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${RECIPE_HINT_BASE}/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'recipe-hints'] });
    },
  });
}
