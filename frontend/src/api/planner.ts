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
  type PlannerEntry,
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
    mutationFn: (body: { title: string }) =>
      postJson(`${API_BASE}/`, body, PlannerSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planners'] });
    },
  });
}

export function useAddPlannerEntry(plannerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { idea_id?: number; date: string; notes?: string }) =>
      postJson(`${API_BASE}/${plannerId}/entries/`, body, PlannerEntrySchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', plannerId] });
    },
  });
}

export function useRemovePlannerEntry(plannerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) =>
      fetch(`${API_BASE}/${plannerId}/entries/${entryId}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
      }).then((res) => { if (!res.ok) throw new Error(`API error: ${res.status}`); }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', plannerId] });
    },
  });
}

export function useInviteCollaborator(plannerId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { user_id: number; role: string }) =>
      postJson(`${API_BASE}/${plannerId}/invite/`, body, z.object({ success: z.boolean(), message: z.string() })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', plannerId] });
    },
  });
}

const UserSearchResultSchema = z.object({
  id: z.number(),
  scout_display_name: z.string(),
  email: z.string(),
});
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;

export function useSearchUsers(query: string) {
  return useQuery<UserSearchResult[]>({
    queryKey: ['users', 'search', query],
    queryFn: () => fetchJson(`/api/users/search/?q=${encodeURIComponent(query)}`, z.array(UserSearchResultSchema)),
    enabled: query.length >= 2,
  });
}
