/**
 * TanStack Query hooks for Authentication API.
 * Session-based auth using Django sessions + CSRF tokens.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserSchema, type User, type LoginInput, type RegisterInput } from '@/schemas/auth';

const API_BASE = '/api/auth';

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

async function fetchWithCsrf(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
      ...options.headers,
    },
  });
}

// --- Queries ---

export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/me/`, { credentials: 'include' });
      if (res.status === 403) return null;
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return UserSchema.parse(data);
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Anmeldung fehlgeschlagen');
      }
      const data = await res.json();
      return UserSchema.parse(data);
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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Registrierung fehlgeschlagen');
      }
      const data = await res.json();
      return UserSchema.parse(data);
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
      await fetchWithCsrf(`${API_BASE}/logout/`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.invalidateQueries();
    },
  });
}
