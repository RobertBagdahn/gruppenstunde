/**
 * TanStack Query hooks for the social-login-only auth API.
 * Sessions are HTTP-only Django cookies; login happens via OAuth redirect (see lib/socialLogin).
 */
import { API_BASE_URL, fetchWithCsrf, parseApiResponse } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AuthProvidersSchema,
  SessionSchema,
  SocialConnectionSchema,
  UserSchema,
  type AuthProviders,
  type DevLoginInput,
  type OnboardingInput,
  type PasswordLoginInput,
  type PasswordRegisterInput,
  type SocialConnection,
  type User,
} from '@/schemas/auth';

const API_BASE = `${API_BASE_URL}/api/auth`;

export const SESSION_QUERY_KEY = ['auth', 'me'] as const;

// --- Queries ---

/** Current user, or null for anonymous visitors (the endpoint always answers 200). */
export function useCurrentUser() {
  return useQuery<User | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/me/`, { credentials: 'include' });
      const session = await parseApiResponse(res, SessionSchema);
      return session.user;
    },
    staleTime: 10 * 60 * 1000,
    retry: false,
    // One session request per page load; login/logout update the cache explicitly.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function useAuthProviders() {
  return useQuery<AuthProviders>({
    queryKey: ['auth', 'providers'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/providers/`, { credentials: 'include' });
      return parseApiResponse(res, AuthProvidersSchema);
    },
    staleTime: 60 * 60 * 1000,
  });
}

export function useConnections(enabled = true) {
  return useQuery<SocialConnection[]>({
    queryKey: ['auth', 'connections'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/connections/`, { credentials: 'include' });
      return parseApiResponse(res, SocialConnectionSchema.array());
    },
    enabled,
  });
}

// --- Mutations ---

export function useDisconnect() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: async (connectionId) => {
      const res = await fetchWithCsrf(`${API_BASE}/connections/${connectionId}/`, { method: 'DELETE' });
      await parseApiResponse(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useDevLogin() {
  const queryClient = useQueryClient();
  return useMutation<User, Error, DevLoginInput>({
    mutationFn: async (payload) => {
      const res = await fetchWithCsrf(`${API_BASE}/dev-login/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return parseApiResponse(res, UserSchema);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
      queryClient.invalidateQueries();
    },
  });
}

/** Transitional e-mail/password login (only while `password_login` is announced). */
export function usePasswordLogin() {
  const queryClient = useQueryClient();
  return useMutation<User, Error, PasswordLoginInput>({
    mutationFn: async (payload) => {
      const res = await fetchWithCsrf(`${API_BASE}/login/`, { method: 'POST', body: JSON.stringify(payload) });
      return parseApiResponse(res, UserSchema);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
      queryClient.invalidateQueries();
    },
  });
}

export function usePasswordRegister() {
  const queryClient = useQueryClient();
  return useMutation<User, Error, PasswordRegisterInput>({
    mutationFn: async (payload) => {
      const res = await fetchWithCsrf(`${API_BASE}/register/`, { method: 'POST', body: JSON.stringify(payload) });
      return parseApiResponse(res, UserSchema);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user);
      queryClient.invalidateQueries();
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
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      // Drop every user-specific cache entry; public data refetches on demand.
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' });
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, OnboardingInput>({
    mutationFn: async (payload) => {
      const res = await fetchWithCsrf(`${API_BASE_URL}/api/profile/me/onboarding/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await parseApiResponse(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
