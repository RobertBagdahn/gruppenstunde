/**
 * User search API hooks.
 */
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { API_BASE_URL } from '@/lib/api';

const UserSearchResultSchema = z.object({
  id: z.number(),
  display_name: z.string(),
});
export type UserSearchResult = z.infer<typeof UserSearchResultSchema>;

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE_URL}/api/users/search/?q=${encodeURIComponent(query)}`,
        { credentials: 'include' },
      );
      if (!res.ok) {
        throw new Error('Fehler bei der Suche');
      }
      return z.array(UserSearchResultSchema).parse(await res.json());
    },
    enabled: query.trim().length >= 2,
  });
}
