/**
 * Generic TanStack Query hooks for content interactions (comments, emotions, views).
 * These provide a unified interface for all content types.
 *
 * Each content type has its own API base (e.g., /api/sessions/, /api/recipes/),
 * but the interaction endpoints (comments, emotions) follow the same pattern.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { ContentCommentSchema } from '@/schemas/content';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

/**
 * Fetch comments for a content item.
 * @param contentType - e.g., 'session', 'blog', 'game', 'recipe'
 * @param contentId - The ID of the content item
 * @param apiBase - The API base path (e.g., '/api/sessions')
 */
export function useContentComments(
  contentType: string,
  contentId: number,
  apiBase: string,
) {
  return useQuery({
    queryKey: [contentType, contentId, 'comments'] as const,
    queryFn: async () => {
      const res = await fetch(`${apiBase}/${contentId}/comments/`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return z.array(ContentCommentSchema).parse(data);
    },
    enabled: contentId > 0,
  });
}

/**
 * Create a comment on a content item.
 */
export function useCreateContentComment(
  contentType: string,
  contentId: number,
  apiBase: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: { text: string; author_name?: string; parent_id?: number | null }) => {
      const res = await fetch(`${apiBase}/${contentId}/comments/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${res.status}`);
      }
      const data = await res.json();
      return ContentCommentSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [contentType, contentId, 'comments'] });
    },
  });
}

// ---------------------------------------------------------------------------
// Emotions
// ---------------------------------------------------------------------------

/**
 * Toggle an emotion on a content item.
 */
export function useToggleContentEmotion(
  contentType: string,
  contentId: number,
  apiBase: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (emotionType: string) => {
      const res = await fetch(`${apiBase}/${contentId}/emotions/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ emotion_type: emotionType }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate both the detail and the emotions
      queryClient.invalidateQueries({ queryKey: [contentType, contentId] });
      queryClient.invalidateQueries({ queryKey: [`${contentType}-detail`] });
    },
  });
}

// ---------------------------------------------------------------------------
// Views (record a view)
// ---------------------------------------------------------------------------

/**
 * Record a view for a content item.
 * Uses the view service endpoint if available.
 */
export function useRecordContentView(
  _contentType: string,
  contentId: number,
  apiBase: string,
) {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${apiBase}/${contentId}/views/`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCsrfToken(),
        },
      });
      // Views endpoint may return 200 or 201, both are fine
      if (!res.ok && res.status !== 204) {
        // Silently ignore view recording failures
        return null;
      }
      return res.json().catch(() => null);
    },
  });
}

// ---------------------------------------------------------------------------
// API base paths for each content type
// ---------------------------------------------------------------------------

export const CONTENT_API_BASES: Record<string, string> = {
  session: '/api/sessions',
  blog: '/api/blogs',
  game: '/api/games',
  recipe: '/api/recipes',
};
