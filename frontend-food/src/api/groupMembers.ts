/**
 * TanStack Query hooks for the GroupMember API.
 * MUST stay in sync with backend/planner/api/meal_plan.py
 */
import { API_BASE_URL } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GroupMemberSchema,
  type GroupMember,
  type GroupMemberCreate,
  type GroupMemberUpdate,
  type GroupMemberBulkCreate,
} from '@/schemas/mealPlan';
import { z } from 'zod';

const API_BASE = `${API_BASE_URL}/api/meal-plans`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function postJson<T>(url: string, body: unknown, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
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

async function patchJson<T>(url: string, body: unknown, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
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

const GroupMemberListSchema = z.array(GroupMemberSchema);

export function useGroupMembers(mealPlanId: number) {
  return useQuery<GroupMember[]>({
    queryKey: ['meal-plan', mealPlanId, 'group-members'],
    queryFn: () => fetchJson(`${API_BASE}/${mealPlanId}/group-members/`, GroupMemberListSchema),
    enabled: mealPlanId > 0,
  });
}

export function useCreateGroupMember(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupMemberCreate) =>
      postJson(`${API_BASE}/${mealPlanId}/group-members/`, body, GroupMemberSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId, 'group-members'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useUpdateGroupMember(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, body }: { memberId: number; body: GroupMemberUpdate }) =>
      patchJson(`${API_BASE}/${mealPlanId}/group-members/${memberId}/`, body, GroupMemberSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId, 'group-members'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useDeleteGroupMember(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) =>
      deleteJson(`${API_BASE}/${mealPlanId}/group-members/${memberId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId, 'group-members'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useBulkCreateGroupMembers(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupMemberBulkCreate) =>
      postJson(`${API_BASE}/${mealPlanId}/group-members/bulk/`, body, GroupMemberListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId, 'group-members'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}

export function useSyncEventParticipants(mealPlanId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      postJson(`${API_BASE}/${mealPlanId}/sync-event-participants/`, {}, GroupMemberListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId, 'group-members'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan', mealPlanId] });
    },
  });
}
