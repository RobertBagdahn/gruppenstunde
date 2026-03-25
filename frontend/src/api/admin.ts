/**
 * TanStack Query hooks for the Admin API.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CommentSchema, type Comment } from '@/schemas/idea';
import { z } from 'zod';

const API_BASE = '/api/admin';

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
  return useQuery<Comment[]>({
    queryKey: ['admin', 'moderation'],
    queryFn: () => fetchJson(`${API_BASE}/moderation/`, z.array(CommentSchema)),
  });
}

export function useModerateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { comment_id: number; action: 'approve' | 'reject' }) =>
      postJson(`${API_BASE}/moderation/`, body, CommentSchema),
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
