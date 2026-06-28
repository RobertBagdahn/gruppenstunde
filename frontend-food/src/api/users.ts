/**
 * Generic user search hook for collaborator invite flows.
 * Uses the core /api/users/search/ endpoint.
 */
import { API_BASE_URL } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

const API_BASE = `${API_BASE_URL}/api/users`;

export const UserSimpleSchema = z.object({
  id: z.number(),
  username: z.string(),
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

async function fetchJson<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return schema.parse(data);
}

export function useUsers(q = '') {
  return useQuery({
    queryKey: ['users', q],
    queryFn: () => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      return fetchJson(
        `${API_BASE}/search/${params.toString() ? `?${params.toString()}` : ''}`,
        PaginatedUsersSchema,
      );
    },
  });
}
