/**
 * TanStack Query hooks for the Planner API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlannerSchema,
  PlannerDetailSchema,
  PlannerEntrySchema,
  type Planner,
  type PlannerDetail,
} from '@/schemas/planner';
import { z } from 'zod';

const API_BASE = '/api/planner';

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
    throw new Error(`API error: ${res.status} ${res.statusText}`);
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

// ==========================================================================
// Planner Hooks
// ==========================================================================

export function usePlanners() {
  return useQuery<Planner[]>({
    queryKey: ['planners'],
    queryFn: () => fetchJson(`${API_BASE}/`, z.array(PlannerSchema)),
  });
}

export function usePlanner(id: number) {
  return useQuery<PlannerDetail>({
    queryKey: ['planner', id],
    queryFn: () => fetchJson(`${API_BASE}/${id}/`, PlannerDetailSchema),
    enabled: id > 0,
  });
}

export function useCreatePlanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      group_id?: number | null;
      weekday?: number;
      time?: string;
    }) => postJson(`${API_BASE}/`, body, PlannerSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planners'] });
    },
  });
}

export function useUpdatePlanner(plannerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title?: string;
      group_id?: number | null;
      weekday?: number;
      time?: string;
    }) => patchJson(`${API_BASE}/${plannerId}/`, body, PlannerSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planners'] });
      queryClient.invalidateQueries({ queryKey: ['planner', plannerId] });
    },
  });
}

export function useDeletePlanner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plannerId: number) => deleteJson(`${API_BASE}/${plannerId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planners'] });
    },
  });
}

// ==========================================================================
// Entry Hooks
// ==========================================================================

export function useAddPlannerEntry(plannerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      session_id?: number;
      date: string;
      notes?: string;
      status?: string;
    }) => postJson(`${API_BASE}/${plannerId}/entries/`, body, PlannerEntrySchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', plannerId] });
    },
  });
}

export function useUpdatePlannerEntry(plannerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      ...body
    }: {
      entryId: number;
      session_id?: number | null;
      date?: string;
      notes?: string;
      status?: string;
    }) =>
      patchJson(
        `${API_BASE}/${plannerId}/entries/${entryId}/`,
        body,
        PlannerEntrySchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', plannerId] });
    },
  });
}

export function useRemovePlannerEntry(plannerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) =>
      deleteJson(`${API_BASE}/${plannerId}/entries/${entryId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', plannerId] });
    },
  });
}

// ==========================================================================
// Collaborator Hooks
// ==========================================================================

export function useInviteCollaborator(plannerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { user_id: number; role: string }) =>
      postJson(
        `${API_BASE}/${plannerId}/invite/`,
        body,
        z.object({ success: z.boolean(), message: z.string() }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', plannerId] });
    },
  });
}

// ==========================================================================
// User Search (shared utility)
// ==========================================================================

const UserSearchResultSchema = z.object({
  id: z.number(),
  scout_display_name: z.string(),
  email: z.string(),
});
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;

export function useSearchUsers(query: string) {
  return useQuery<UserSearchResult[]>({
    queryKey: ['users', 'search', query],
    queryFn: () =>
      fetchJson(
        `/api/users/search/?q=${encodeURIComponent(query)}`,
        z.array(UserSearchResultSchema),
      ),
    enabled: query.length >= 2,
  });
}
