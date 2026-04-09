/**
 * TanStack Query hooks for the Game API.
 * MUST stay in sync with backend/game/api.py
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PaginatedGamesSchema,
  GameDetailSchema,
  type GameFilter,
  type GameDetail,
} from '@/schemas/game';
import {
  ContentCommentSchema,
} from '@/schemas/content';

const API_BASE = '/api/games';

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

function buildFilterParams(filters: Partial<GameFilter>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.game_type) params.set('game_type', filters.game_type);
  if (filters.play_area) params.set('play_area', filters.play_area);
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.scout_level_ids?.length) {
    params.set('scout_level_ids', filters.scout_level_ids.join(','));
  }
  if (filters.tag_slugs?.length) {
    params.set('tag_slugs', filters.tag_slugs.join(','));
  }
  return params.toString();
}

// --- Query Hooks ---

export function useGames(filters: Partial<GameFilter> = {}) {
  const queryString = buildFilterParams(filters);
  return useQuery({
    queryKey: ['games', filters] as const,
    queryFn: () => fetchJson(`${API_BASE}/?${queryString}`, PaginatedGamesSchema),
  });
}

export function useGame(id: number) {
  return useQuery({
    queryKey: ['game', id] as const,
    queryFn: () => fetchJson(`${API_BASE}/${id}/`, GameDetailSchema),
    enabled: id > 0,
  });
}

export function useGameBySlug(slug: string) {
  return useQuery({
    queryKey: ['game', 'slug', slug] as const,
    queryFn: () =>
      fetchJson(
        `${API_BASE}/by-slug/${encodeURIComponent(slug)}/`,
        GameDetailSchema,
      ),
    enabled: slug.length > 0,
  });
}

export function useGameComments(gameId: number) {
  return useQuery({
    queryKey: ['game', gameId, 'comments'] as const,
    queryFn: () =>
      fetchJson(`${API_BASE}/${gameId}/comments/`, z.array(ContentCommentSchema)),
    enabled: gameId > 0,
  });
}

// --- Mutation Hooks ---

export interface GameCreatePayload {
  title: string;
  summary?: string;
  summary_long?: string;
  description?: string;
  costs_rating?: string;
  execution_time?: string;
  preparation_time?: string;
  difficulty?: string;
  game_type?: string;
  play_area?: string;
  min_players?: number | null;
  max_players?: number | null;
  game_duration_minutes?: number | null;
  rules?: string;
  tag_ids?: number[];
  scout_level_ids?: number[];
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  return useMutation<GameDetail, Error, GameCreatePayload>({
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
      return GameDetailSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export interface GameUpdatePayload {
  title?: string;
  summary?: string;
  summary_long?: string;
  description?: string;
  costs_rating?: string;
  execution_time?: string;
  preparation_time?: string;
  difficulty?: string;
  status?: string;
  game_type?: string;
  play_area?: string;
  min_players?: number | null;
  max_players?: number | null;
  game_duration_minutes?: number | null;
  rules?: string;
  tag_ids?: number[];
  scout_level_ids?: number[];
}

export function useUpdateGame(gameId: number) {
  const queryClient = useQueryClient();
  return useMutation<GameDetail, Error, GameUpdatePayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE}/${gameId}/`, {
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
      return GameDetailSchema.parse(data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['game', gameId], updated);
      queryClient.setQueryData(['game', 'slug', updated.slug], updated);
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useDeleteGame(gameId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, Error>({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/${gameId}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
      queryClient.removeQueries({ queryKey: ['game', gameId] });
    },
  });
}

export function useCreateGameComment(gameId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { text: string; author_name?: string; parent_id?: number | null }) => {
      const res = await fetch(`${API_BASE}/${gameId}/comments/`, {
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
      queryClient.invalidateQueries({ queryKey: ['game', gameId, 'comments'] });
    },
  });
}

export function useToggleGameEmotion(gameId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { emotion_type: string }) => {
      const res = await fetch(`${API_BASE}/${gameId}/emotions/`, {
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
      queryClient.invalidateQueries({ queryKey: ['game', gameId] });
      queryClient.invalidateQueries({ queryKey: ['game', 'slug'] });
    },
  });
}
