/**
 * TanStack Query hooks for Content Links and Featured Content API.
 * MUST stay in sync with backend/content/api.py
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  ContentLinkSchema,
  FeaturedContentSchema,
  type ContentLinkCreate,
  type FeaturedContentCreate,
} from '@/schemas/contentLink';

const API_BASE = '/api/content';

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

// ---------------------------------------------------------------------------
// Content Links
// ---------------------------------------------------------------------------

/**
 * Fetch content links for a specific content object.
 */
export function useContentLinks(
  contentType: string,
  objectId: number,
  direction: 'outgoing' | 'incoming' | 'both' = 'both',
) {
  return useQuery({
    queryKey: ['content-links', contentType, objectId, direction] as const,
    queryFn: async () => {
      const params = new URLSearchParams({
        content_type: contentType,
        object_id: String(objectId),
        direction,
      });
      const res = await fetch(`${API_BASE}/links/?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return z.array(ContentLinkSchema).parse(data);
    },
    enabled: !!contentType && objectId > 0,
  });
}

/**
 * Create a manual content link.
 */
export function useCreateContentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ContentLinkCreate) => {
      const res = await fetch(`${API_BASE}/links/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${res.status}`);
      }
      const data = await res.json();
      return ContentLinkSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-links'] });
    },
  });
}

/**
 * Reject a content link (admin only).
 */
export function useRejectContentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: number) => {
      const res = await fetch(`${API_BASE}/links/${linkId}/reject/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-links'] });
    },
  });
}

/**
 * Delete a content link (creator or admin).
 */
export function useDeleteContentLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (linkId: number) => {
      const res = await fetch(`${API_BASE}/links/${linkId}/`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });
      if (!res.ok && res.status !== 204) throw new Error(`API error: ${res.status}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-links'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Featured Content
// ---------------------------------------------------------------------------

/**
 * Fetch active featured content.
 */
export function useFeaturedContent() {
  return useQuery({
    queryKey: ['featured-content'] as const,
    queryFn: () =>
      fetchJson(`${API_BASE}/featured/`, z.array(FeaturedContentSchema)),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create a featured content entry (admin only).
 */
export function useCreateFeaturedContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FeaturedContentCreate) => {
      const res = await fetch(`${API_BASE}/featured/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return FeaturedContentSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-content'] });
    },
  });
}
