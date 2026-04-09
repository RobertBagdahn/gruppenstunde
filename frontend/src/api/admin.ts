/**
 * TanStack Query hooks for the Admin API.
 *
 * Includes both legacy admin endpoints (/api/admin/) and
 * new content admin endpoints (/api/content/admin/).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ContentCommentSchema, type ContentComment } from '@/schemas/content';
import { z } from 'zod';

const API_BASE = '/api/admin';
const CONTENT_API_BASE = '/api/content/admin';

function getCsrfToken(): string {
  return document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '';
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

// --- Statistics ---

const StatsSchema = z.object({
  total_ideas: z.number(),
  published_ideas: z.number(),
  total_users: z.number(),
  total_comments: z.number(),
  pending_comments: z.number(),
  views_last_30_days: z.number(),
  top_ideas: z.array(z.object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
    view_count: z.number(),
    like_score: z.number(),
  })),
});
export type Stats = z.infer<typeof StatsSchema>;

export function useAdminStats() {
  return useQuery<Stats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => fetchJson(`${API_BASE}/statistics/`, StatsSchema),
  });
}

// --- Moderation Queue ---

export function useModerationQueue() {
  return useQuery<ContentComment[]>({
    queryKey: ['admin', 'moderation'],
    queryFn: () => fetchJson(`${API_BASE}/moderation/`, z.array(ContentCommentSchema)),
  });
}

export function useModerateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { comment_id: number; action: 'approve' | 'reject' }) =>
      postJson(`${API_BASE}/moderation/`, body, ContentCommentSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] });
    },
  });
}

// --- Idea of the Week ---

const IdeaOfTheWeekEntrySchema = z.object({
  id: z.number(),
  idea: z.object({
    id: z.number(),
    title: z.string(),
    slug: z.string(),
    summary: z.string(),
  }),
  release_date: z.string(),
  description: z.string(),
});
export type IdeaOfTheWeekEntry = z.infer<typeof IdeaOfTheWeekEntrySchema>;

export function useIdeasOfTheWeek() {
  return useQuery<IdeaOfTheWeekEntry[]>({
    queryKey: ['admin', 'idea-of-the-week'],
    queryFn: () => fetchJson(`${API_BASE}/idea-of-the-week/`, z.array(IdeaOfTheWeekEntrySchema)),
  });
}

export function useSetIdeaOfWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { idea_id: number; description?: string; release_date?: string }) =>
      postJson(`${API_BASE}/idea-of-the-week/`, body, IdeaOfTheWeekEntrySchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'idea-of-the-week'] });
    },
  });
}

export function useRemoveIdeaOfWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (entryId: number) =>
      fetch(`${API_BASE}/idea-of-the-week/${entryId}/`, { method: 'DELETE' }).then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'idea-of-the-week'] });
    },
  });
}

// --- Users ---

const AdminUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  is_staff: z.boolean(),
  is_active: z.boolean(),
  date_joined: z.string(),
});
export type AdminUser = z.infer<typeof AdminUserSchema>;

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: () => fetchJson(`${API_BASE}/users/`, z.array(AdminUserSchema)),
  });
}

// --- User Detail ---

const AdminUserIdeaSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  status: z.string(),
  idea_type: z.string(),
  created_at: z.string(),
});

const AdminUserCommentSchema = z.object({
  id: z.number(),
  text: z.string(),
  status: z.string(),
  created_at: z.string(),
  idea_title: z.string().nullable(),
  idea_slug: z.string().nullable(),
});

const AdminUserDetailSchema = z.object({
  id: z.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  is_staff: z.boolean(),
  is_active: z.boolean(),
  date_joined: z.string(),
  last_login: z.string().nullable(),
  ideas: z.array(AdminUserIdeaSchema),
  comments: z.array(AdminUserCommentSchema),
});
export type AdminUserDetail = z.infer<typeof AdminUserDetailSchema>;

export function useAdminUserDetail(userId: number) {
  return useQuery<AdminUserDetail>({
    queryKey: ['admin', 'users', userId],
    queryFn: () => fetchJson(`${API_BASE}/users/${userId}/`, AdminUserDetailSchema),
    enabled: userId > 0,
  });
}

// --- Instagram Export ---

const InstagramSchema = z.object({
  slides: z.array(z.string()),
});

export function useInstagramExport() {
  return useMutation({
    mutationFn: (ideaId: number) =>
      postJson(`${API_BASE}/instagram-export/`, { idea_id: ideaId }, InstagramSchema),
  });
}

// --- Recent Activity ---

const RecentViewSchema = z.object({
  id: z.number(),
  created_at: z.string(),
  idea_title: z.string().nullable(),
  idea_slug: z.string().nullable(),
  user_email: z.string().nullable(),
});

const RecentSearchSchema = z.object({
  id: z.number(),
  query: z.string(),
  results_count: z.number(),
  created_at: z.string(),
  user_email: z.string().nullable(),
});

const RecentIdeaSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  status: z.string(),
  idea_type: z.string(),
  created_at: z.string(),
  author_email: z.string().nullable(),
});

const RecentActivitySchema = z.object({
  recent_views: z.array(RecentViewSchema),
  recent_searches: z.array(RecentSearchSchema),
  recent_ideas: z.array(RecentIdeaSchema),
});
export type RecentActivity = z.infer<typeof RecentActivitySchema>;

export function useRecentActivity() {
  return useQuery<RecentActivity>({
    queryKey: ['admin', 'recent-activity'],
    queryFn: () => fetchJson(`${API_BASE}/recent-activity/`, RecentActivitySchema),
  });
}

// --- Trending (7 days) ---

const TrendingIdeaViewsSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  views_7d: z.number(),
});

const TrendingIdeaLikesSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  likes_7d: z.number(),
});

const TrendingSchema = z.object({
  most_viewed: z.array(TrendingIdeaViewsSchema),
  most_liked: z.array(TrendingIdeaLikesSchema),
});
export type Trending = z.infer<typeof TrendingSchema>;

export function useTrending() {
  return useQuery<Trending>({
    queryKey: ['admin', 'trending'],
    queryFn: () => fetchJson(`${API_BASE}/trending/`, TrendingSchema),
  });
}

// ==========================================================================
// Content Admin: Approval Queue
// ==========================================================================

const ApprovalQueueItemSchema = z.object({
  content_type: z.string(),
  object_id: z.number(),
  title: z.string(),
  slug: z.string(),
  summary: z.string(),
  submitted_at: z.string(),
  author: z.string().nullable(),
});
export type ApprovalQueueItem = z.infer<typeof ApprovalQueueItemSchema>;

const PaginatedApprovalQueueSchema = z.object({
  items: z.array(ApprovalQueueItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedApprovalQueue = z.infer<typeof PaginatedApprovalQueueSchema>;

export function useApprovalQueue(page = 1, pageSize = 20) {
  return useQuery<PaginatedApprovalQueue>({
    queryKey: ['admin', 'approvals', page, pageSize],
    queryFn: () =>
      fetchJson(
        `${CONTENT_API_BASE}/approvals/?page=${page}&page_size=${pageSize}`,
        PaginatedApprovalQueueSchema,
      ),
  });
}

const ApprovalActionResultSchema = z.object({
  success: z.boolean(),
  content_type: z.string(),
  object_id: z.number(),
  new_status: z.string(),
  message: z.string(),
});
export type ApprovalActionResult = z.infer<typeof ApprovalActionResultSchema>;

export function useApprovalAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      contentType: string;
      objectId: number;
      action: 'approve' | 'reject';
      reason?: string;
    }) =>
      postJson(
        `${CONTENT_API_BASE}/approvals/${params.contentType}/${params.objectId}/`,
        { action: params.action, reason: params.reason ?? '' },
        ApprovalActionResultSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'approvals'] });
    },
  });
}

const ApprovalLogItemSchema = z.object({
  id: z.number(),
  content_type: z.string(),
  object_id: z.number(),
  action: z.string(),
  reviewer_name: z.string().nullable(),
  reason: z.string(),
  created_at: z.string(),
});
export type ApprovalLogItem = z.infer<typeof ApprovalLogItemSchema>;

export function useApprovalHistory(contentType: string, objectId: number) {
  return useQuery<ApprovalLogItem[]>({
    queryKey: ['admin', 'approval-history', contentType, objectId],
    queryFn: () =>
      fetchJson(
        `${CONTENT_API_BASE}/approvals/${contentType}/${objectId}/history/`,
        z.array(ApprovalLogItemSchema),
      ),
    enabled: !!contentType && objectId > 0,
  });
}

// ==========================================================================
// Content Admin: Embedding Viewer
// ==========================================================================

const EmbeddingStatusItemSchema = z.object({
  content_type: z.string(),
  object_id: z.number(),
  title: z.string(),
  slug: z.string(),
  has_embedding: z.boolean(),
  embedding_updated_at: z.string().nullable(),
  content_updated_at: z.string(),
  is_stale: z.boolean(),
});
export type EmbeddingStatusItem = z.infer<typeof EmbeddingStatusItemSchema>;

const EmbeddingStatsSchema = z.object({
  total: z.number(),
  with_embedding: z.number(),
  stale: z.number(),
  missing: z.number(),
});
export type EmbeddingStats = z.infer<typeof EmbeddingStatsSchema>;

const PaginatedEmbeddingStatusSchema = z.object({
  items: z.array(EmbeddingStatusItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
  stats: EmbeddingStatsSchema,
});
export type PaginatedEmbeddingStatus = z.infer<typeof PaginatedEmbeddingStatusSchema>;

export function useEmbeddingStatus(
  contentType = '',
  statusFilter = '',
  page = 1,
  pageSize = 20,
) {
  const params = new URLSearchParams();
  if (contentType) params.set('content_type', contentType);
  if (statusFilter) params.set('status_filter', statusFilter);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  return useQuery<PaginatedEmbeddingStatus>({
    queryKey: ['admin', 'embeddings', contentType, statusFilter, page, pageSize],
    queryFn: () =>
      fetchJson(
        `${CONTENT_API_BASE}/embeddings/?${params}`,
        PaginatedEmbeddingStatusSchema,
      ),
  });
}

const BatchEmbeddingResultSchema = z.object({
  updated: z.number(),
  skipped: z.number(),
  failed: z.number(),
});
export type BatchEmbeddingResult = z.infer<typeof BatchEmbeddingResultSchema>;

export function useBatchUpdateEmbeddings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { content_type?: string; force?: boolean; limit?: number }) =>
      postJson(
        `${CONTENT_API_BASE}/embeddings/batch-update/`,
        params,
        BatchEmbeddingResultSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'embeddings'] });
    },
  });
}

// ==========================================================================
// Content Admin: Embedding Feedback
// ==========================================================================

const EmbeddingFeedbackItemSchema = z.object({
  id: z.number(),
  content_link_id: z.number(),
  source_content_type: z.string(),
  source_title: z.string(),
  target_content_type: z.string(),
  target_title: z.string(),
  feedback_type: z.string(),
  notes: z.string(),
  created_by_name: z.string().nullable(),
  created_at: z.string(),
});
export type EmbeddingFeedbackItem = z.infer<typeof EmbeddingFeedbackItemSchema>;

const PaginatedEmbeddingFeedbackSchema = z.object({
  items: z.array(EmbeddingFeedbackItemSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedEmbeddingFeedback = z.infer<typeof PaginatedEmbeddingFeedbackSchema>;

export function useEmbeddingFeedback(feedbackType = '', page = 1, pageSize = 20) {
  const params = new URLSearchParams();
  if (feedbackType) params.set('feedback_type', feedbackType);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  return useQuery<PaginatedEmbeddingFeedback>({
    queryKey: ['admin', 'embedding-feedback', feedbackType, page, pageSize],
    queryFn: () =>
      fetchJson(
        `${CONTENT_API_BASE}/embedding-feedback/?${params}`,
        PaginatedEmbeddingFeedbackSchema,
      ),
  });
}
