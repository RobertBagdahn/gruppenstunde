/**
 * TanStack Query hooks for Authentication API.
 * Session-based auth using Django sessions + CSRF tokens.
 */
import { API_BASE_URL, fetchWithCsrf, parseApiResponse } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserSchema, type User, type LoginInput, type RegisterInput } from '@/schemas/auth';

const API_BASE = `${API_BASE_URL}/api/auth`;

// --- Queries ---

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/me/`, { credentials: 'include' });
      if (res.status === 403) return null;
      return parseApiResponse(res, UserSchema);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });
}

// --- Mutations ---

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<User, Error, LoginInput>({
    mutationFn: async (payload) => {
      const res = await fetchWithCsrf(`${API_BASE}/login/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return parseApiResponse(res, UserSchema);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation<User, Error, RegisterInput>({
    mutationFn: async (payload) => {
      const res = await fetchWithCsrf(`${API_BASE}/register/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return parseApiResponse(res, UserSchema);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation<void, Error>({
    mutationFn: async () => {
      const res = await fetchWithCsrf(`${API_BASE}/logout/`, { method: 'POST' });
      await parseApiResponse(res);
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.invalidateQueries();
    },
  });
}
