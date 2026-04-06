/**
 * TanStack Query hooks for the Idea API.
 * Replaces the old activities.ts hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PaginatedIdeasSchema,
  IdeaDetailSchema,
  IdeaSimilarSchema,
  CommentSchema,
  AutocompleteSchema,
  type IdeaFilter,
  type PaginatedIdeas,
  type IdeaDetail,
  type IdeaSimilar,
  type Comment,
  type Autocomplete,
} from '@/schemas/idea';
import { z } from 'zod';

const API_BASE = '/api/ideas';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchJson<T>(url: string, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

async function postJson<T>(url: string, body: unknown, schema: z.ZodSchema<T>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

function buildFilterParams(filters: Partial<IdeaFilter>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.idea_type?.length) {
    filters.idea_type.forEach((t) => params.append('idea_type', t));
  }
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.costs_rating) params.set('costs_rating', filters.costs_rating);
  if (filters.execution_time) params.set('execution_time', filters.execution_time);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.page_size) params.set('page_size', String(filters.page_size));
  if (filters.scout_level_ids?.length) {
    filters.scout_level_ids.forEach((id) => params.append('scout_level_ids', String(id)));
  }
  if (filters.tag_slugs?.length) {
    filters.tag_slugs.forEach((slug) => params.append('tag_slugs', slug));
  }
  return params.toString();
}

// --- Query Hooks ---

export function useIdeas(filters: Partial<IdeaFilter> = {}) {
  const queryString = buildFilterParams(filters);
  return useQuery<PaginatedIdeas>({
    queryKey: ['ideas', filters],
    queryFn: () => fetchJson(`${API_BASE}/search/?${queryString}`, PaginatedIdeasSchema),
  });
}

export function useIdea(id: number) {
  return useQuery<IdeaDetail>({
    queryKey: ['idea', id],
    queryFn: async () => {
      const result = await fetchJson(`${API_BASE}/${id}/`, IdeaDetailSchema);
      return result as IdeaDetail;
    },
    enabled: id > 0,
  });
}

export function useIdeaBySlug(slug: string) {
  return useQuery<IdeaDetail>({
    queryKey: ['idea', 'slug', slug],
    queryFn: async () => {
      const result = await fetchJson(`${API_BASE}/by-slug/${encodeURIComponent(slug)}/`, IdeaDetailSchema);
      return result as IdeaDetail;
    },
    enabled: slug.length > 0,
  });
}

export function useSimilarIdeas(id: number) {
  return useQuery<IdeaSimilar[]>({
    queryKey: ['idea', id, 'similar'],
    queryFn: () => fetchJson(`${API_BASE}/${id}/similar/`, z.array(IdeaSimilarSchema)),
    enabled: id > 0,
  });
}

export function useComments(ideaId: number) {
  return useQuery<Comment[]>({
    queryKey: ['comments', ideaId],
    queryFn: () => fetchJson(`${API_BASE}/${ideaId}/comments/`, z.array(CommentSchema)),
    enabled: ideaId > 0,
  });
}

export function useAutocomplete(q: string) {
  return useQuery<Autocomplete[]>({
    queryKey: ['autocomplete', q],
    queryFn: () => fetchJson(`${API_BASE}/autocomplete/?q=${encodeURIComponent(q)}`, z.array(AutocompleteSchema)),
    enabled: q.length >= 2,
  });
}

// --- Idea of the Week (public) ---

const IdeaOfTheWeekSchema = z.object({
  id: z.number(),
  idea: z.object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
    summary: z.string(),
    image_url: z.string().nullable().optional(),
  }),
  release_date: z.string(),
  description: z.string(),
});
export type IdeaOfTheWeek = z.infer<typeof IdeaOfTheWeekSchema>;

export function useIdeaOfTheWeek() {
  return useQuery<IdeaOfTheWeek | null>({
    queryKey: ['idea-of-the-week'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/idea-of-the-week/`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      if (!data) return null;
      return IdeaOfTheWeekSchema.parse(data);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// --- Mutations ---

export function useCreateComment(ideaId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { text: string; author_name?: string }) =>
      postJson(`${API_BASE}/${ideaId}/comments/`, body, CommentSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', ideaId] });
    },
  });
}

export function useCreateEmotion(ideaId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { emotion_type: string }) => {
      const res = await fetch(`${API_BASE}/${ideaId}/emotions/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      if (res.status === 204) return null;
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idea', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['idea', 'slug'] });
    },
  });
}

export interface IdeaUpdatePayload {
  idea_type?: string;
  title?: string;
  summary?: string;
  summary_long?: string;
  description?: string;
  costs_rating?: string;
  execution_time?: string;
  preparation_time?: string;
  difficulty?: string;
  status?: string;
  scout_level_ids?: number[];
  tag_ids?: number[];
  materials?: Array<{
    quantity: string;
    material_name: string;
    material_unit: string;
    quantity_type: string;
  }>;
  image_url?: string;
}

export function useUpdateIdea(ideaId: number) {
  const queryClient = useQueryClient();
  return useMutation<IdeaDetail, Error, IdeaUpdatePayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE}/${ideaId}/`, {
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
      return IdeaDetailSchema.parse(data);
    },
    onSuccess: (updatedIdea) => {
      queryClient.setQueryData(['idea', ideaId], updatedIdea);
      queryClient.setQueryData(['idea', 'slug', updatedIdea.slug], updatedIdea);
      queryClient.invalidateQueries({ queryKey: ['ideas'] });
    },
  });
}
