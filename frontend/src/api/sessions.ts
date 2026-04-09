/**
 * TanStack Query hooks for the GroupSession API.
 * MUST stay in sync with backend/session/api.py
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PaginatedGroupSessionsSchema,
  GroupSessionDetailSchema,
  type GroupSessionFilter,
  type GroupSessionDetail,
} from '@/schemas/session';
import {
  ContentCommentSchema,
} from '@/schemas/content';

const API_BASE = '/api/sessions';

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

function buildFilterParams(filters: Partial<GroupSessionFilter>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.session_type) params.set('session_type', filters.session_type);
  if (filters.location_type) params.set('location_type', filters.location_type);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.costs_rating) params.set('costs_rating', filters.costs_rating);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.scout_level_ids?.length) {
    params.set('scout_level_ids', filters.scout_level_ids.join(','));
  }
  if (filters.tag_slugs?.length) {
    filters.tag_slugs.forEach((slug) => params.append('tag_slugs', slug));
  }
  return params.toString();
}

// --- Query Hooks ---

export function useSessions(filters: Partial<GroupSessionFilter> = {}) {
  const queryString = buildFilterParams(filters);
  return useQuery({
    queryKey: ['sessions', filters] as const,
    queryFn: () => fetchJson(`${API_BASE}/?${queryString}`, PaginatedGroupSessionsSchema),
  });
}

export function useSession(id: number) {
  return useQuery({
    queryKey: ['session', id] as const,
    queryFn: () => fetchJson(`${API_BASE}/${id}/`, GroupSessionDetailSchema),
    enabled: id > 0,
  });
}

export function useSessionBySlug(slug: string) {
  return useQuery({
    queryKey: ['session', 'slug', slug] as const,
    queryFn: () =>
      fetchJson(
        `${API_BASE}/by-slug/${encodeURIComponent(slug)}/`,
        GroupSessionDetailSchema,
      ),
    enabled: slug.length > 0,
  });
}

export function useSessionComments(sessionId: number) {
  return useQuery({
    queryKey: ['session', sessionId, 'comments'] as const,
    queryFn: () =>
      fetchJson(`${API_BASE}/${sessionId}/comments/`, z.array(ContentCommentSchema)),
    enabled: sessionId > 0,
  });
}

// --- Mutation Hooks ---

export interface SessionCreatePayload {
  title: string;
  summary?: string;
  summary_long?: string;
  description?: string;
  costs_rating?: string;
  execution_time?: string;
  preparation_time?: string;
  difficulty?: string;
  session_type?: string;
  location_type?: string;
  min_participants?: number | null;
  max_participants?: number | null;
  tag_ids?: number[];
  scout_level_ids?: number[];
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  return useMutation<GroupSessionDetail, Error, SessionCreatePayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE}/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `API error: ${res.status}`);
      }
      const data = await res.json();
      return GroupSessionDetailSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export interface SessionUpdatePayload {
  title?: string;
  summary?: string;
  summary_long?: string;
  description?: string;
  costs_rating?: string;
  execution_time?: string;
  preparation_time?: string;
  difficulty?: string;
  status?: string;
  session_type?: string;
  location_type?: string;
  min_participants?: number | null;
  max_participants?: number | null;
  tag_ids?: number[];
  scout_level_ids?: number[];
}

export function useUpdateSession(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation<GroupSessionDetail, Error, SessionUpdatePayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE}/${sessionId}/`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `API error: ${res.status}`);
      }
      const data = await res.json();
      return GroupSessionDetailSchema.parse(data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['session', sessionId], updated);
      queryClient.setQueryData(['session', 'slug', updated.slug], updated);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useDeleteSession(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, Error>({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/${sessionId}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.removeQueries({ queryKey: ['session', sessionId] });
    },
  });
}

export function useCreateSessionComment(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { text: string; author_name?: string; parent_id?: number | null }) => {
      const res = await fetch(`${API_BASE}/${sessionId}/comments/`, {
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId, 'comments'] });
    },
  });
}

export function useToggleSessionEmotion(sessionId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { emotion_type: string }) => {
      const res = await fetch(`${API_BASE}/${sessionId}/emotions/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      if (res.status === 204) return null;
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['session', 'slug'] });
    },
  });
}
