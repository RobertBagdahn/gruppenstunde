/**
 * TanStack Query hooks for the Blog API.
 * MUST stay in sync with backend/blog/api.py
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  PaginatedBlogsSchema,
  BlogDetailSchema,
  type BlogFilter,
  type BlogDetail,
} from '@/schemas/blog';
import {
  ContentCommentSchema,
} from '@/schemas/content';

const API_BASE = '/api/blogs';

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

function buildFilterParams(filters: Partial<BlogFilter>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.blog_type) params.set('blog_type', filters.blog_type);
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

export function useBlogs(filters: Partial<BlogFilter> = {}) {
  const queryString = buildFilterParams(filters);
  return useQuery({
    queryKey: ['blogs', filters] as const,
    queryFn: () => fetchJson(`${API_BASE}/?${queryString}`, PaginatedBlogsSchema),
  });
}

export function useBlog(id: number) {
  return useQuery({
    queryKey: ['blog', id] as const,
    queryFn: () => fetchJson(`${API_BASE}/${id}/`, BlogDetailSchema),
    enabled: id > 0,
  });
}

export function useBlogBySlug(slug: string) {
  return useQuery({
    queryKey: ['blog', 'slug', slug] as const,
    queryFn: () =>
      fetchJson(
        `${API_BASE}/by-slug/${encodeURIComponent(slug)}/`,
        BlogDetailSchema,
      ),
    enabled: slug.length > 0,
  });
}

export function useBlogComments(blogId: number) {
  return useQuery({
    queryKey: ['blog', blogId, 'comments'] as const,
    queryFn: () =>
      fetchJson(`${API_BASE}/${blogId}/comments/`, z.array(ContentCommentSchema)),
    enabled: blogId > 0,
  });
}

// --- Mutation Hooks ---

export interface BlogCreatePayload {
  title: string;
  summary?: string;
  summary_long?: string;
  description?: string;
  costs_rating?: string;
  execution_time?: string;
  preparation_time?: string;
  difficulty?: string;
  blog_type?: string;
  show_table_of_contents?: boolean;
  tag_ids?: number[];
  scout_level_ids?: number[];
}

export function useCreateBlog() {
  const queryClient = useQueryClient();
  return useMutation<BlogDetail, Error, BlogCreatePayload>({
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
      return BlogDetailSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
    },
  });
}

export interface BlogUpdatePayload {
  title?: string;
  summary?: string;
  summary_long?: string;
  description?: string;
  costs_rating?: string;
  execution_time?: string;
  preparation_time?: string;
  difficulty?: string;
  status?: string;
  blog_type?: string;
  show_table_of_contents?: boolean;
  tag_ids?: number[];
  scout_level_ids?: number[];
}

export function useUpdateBlog(blogId: number) {
  const queryClient = useQueryClient();
  return useMutation<BlogDetail, Error, BlogUpdatePayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`${API_BASE}/${blogId}/`, {
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
      return BlogDetailSchema.parse(data);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['blog', blogId], updated);
      queryClient.setQueryData(['blog', 'slug', updated.slug], updated);
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
    },
  });
}

export function useDeleteBlog(blogId: number) {
  const queryClient = useQueryClient();
  return useMutation<void, Error>({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/${blogId}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blogs'] });
      queryClient.removeQueries({ queryKey: ['blog', blogId] });
    },
  });
}

export function useCreateBlogComment(blogId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { text: string; author_name?: string; parent_id?: number | null }) => {
      const res = await fetch(`${API_BASE}/${blogId}/comments/`, {
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
      queryClient.invalidateQueries({ queryKey: ['blog', blogId, 'comments'] });
    },
  });
}

export function useToggleBlogEmotion(blogId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { emotion_type: string }) => {
      const res = await fetch(`${API_BASE}/${blogId}/emotions/`, {
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
      queryClient.invalidateQueries({ queryKey: ['blog', blogId] });
      queryClient.invalidateQueries({ queryKey: ['blog', 'slug'] });
    },
  });
}
