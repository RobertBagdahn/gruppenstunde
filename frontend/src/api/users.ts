/**
 * User search API hooks for collaborator invites.
 * The backend returns display names only (never e-mails).
 * MUST stay in sync with backend/core/schemas.py (UserSimpleOut, PaginatedUserOut).
 */
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { API_BASE_URL, parseApiResponse } from '@/lib/api';

/** Mirrors USER_SEARCH_MIN_QUERY_LENGTH in backend/core/services/user_directory.py. */
export const USER_SEARCH_MIN_QUERY_LENGTH = 2;

const UserSearchResultSchema = z.object({
  id: z.number(),
  display_name: z.string(),
});
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;

const PaginatedUserSearchSchema = z.object({
  items: z.array(UserSearchResultSchema),
  total: z.number(),
  page: z.number(),
  page_size: z.number(),
  total_pages: z.number(),
});

/** Searches users by name or exact e-mail; returns the first result page. */
export function useSearchUsers(query: string) {
  const q = query.trim();
  return useQuery<UserSearchResult[]>({
    queryKey: ['users', 'search', q],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/users/search/?q=${encodeURIComponent(q)}`,
        { credentials: 'include' },
      );
      const page = await parseApiResponse(res, PaginatedUserSearchSchema);
      return page.items;
    },
    enabled: q.length >= USER_SEARCH_MIN_QUERY_LENGTH,
  });
}
