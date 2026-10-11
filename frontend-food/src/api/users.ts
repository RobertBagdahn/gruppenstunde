/**
 * User search hook for collaborator invite flows.
 * Uses the core /api/users/search/ endpoint, which returns display names only (never e-mails).
 * MUST stay in sync with backend/core/schemas.py (UserSimpleOut, PaginatedUserOut).
 */
import { API_BASE_URL, parseApiResponse } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const API_BASE = `${API_BASE_URL}/api/users`;

/** Mirrors USER_SEARCH_MIN_QUERY_LENGTH in backend/core/services/user_directory.py. */
export const USER_SEARCH_MIN_QUERY_LENGTH = 2;

export const UserSimpleSchema = z.object({
  id: z.number(),
  display_name: z.string(),
});
export type UserSimple = z.infer<typeof UserSimpleSchema>;

export const PaginatedUsersSchema = z.object({
  items: z.array(UserSimpleSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});
export type PaginatedUsers = z.infer<typeof PaginatedUsersSchema>;

/** Searches users by name or exact e-mail; disabled until the query is long enough. */
export function useUsers(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query });
      const res = await fetch(`${API_BASE}/search/?${params.toString()}`, { credentials: 'include' });
      return parseApiResponse(res, PaginatedUsersSchema);
    },
    enabled: query.length >= USER_SEARCH_MIN_QUERY_LENGTH,
  });
}
