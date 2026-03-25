/**
 * TanStack Query hooks for Profile & Group API.
 * MUST stay in sync with backend/profiles/api.py
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserProfileSchema,
  UserGroupSchema,
  UserGroupDetailSchema,
  UserPreferenceSchema,
  JoinRequestSchema,
  GroupMemberSchema,
  PublicUserProfileSchema,
  MyIdeaSchema,
  type UserProfile,
  type UserProfileUpdate,
  type UserPreference,
  type UserPreferenceUpdate,
  type UserGroup,
  type UserGroupDetail,
  type UserGroupCreate,
  type JoinRequest,
  type GroupMember,
  type PublicUserProfile,
  type MyIdea,
} from '@/schemas/profile';

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

// ==========================================================================
// Profile
// ==========================================================================

export function useMyProfile() {
  return useQuery<UserProfile>({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await fetch('/api/profile/me/', { credentials: 'include' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return UserProfileSchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation<UserProfile, Error, UserProfileUpdate>({
    mutationFn: async (payload) => {
      const res = await fetchWithCsrf('/api/profile/me/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Profil konnte nicht aktualisiert werden');
      }
      const data = await res.json();
      return UserProfileSchema.parse(data);
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile', 'me'], profile);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function usePublicUserProfile(userId: number) {
  return useQuery<PublicUserProfile>({
    queryKey: ['profile', 'public', userId],
    queryFn: async () => {
      const res = await fetch(`/api/profile/${userId}/`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return PublicUserProfileSchema.parse(data);
    },
    enabled: userId > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// ==========================================================================
// Preferences
// ==========================================================================

export function useMyPreferences() {
  return useQuery<UserPreference>({
    queryKey: ['profile', 'preferences'],
    queryFn: async () => {
      const res = await fetch('/api/profile/me/preferences/', { credentials: 'include' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return UserPreferenceSchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateMyPreferences() {
  const queryClient = useQueryClient();
  return useMutation<UserPreference, Error, UserPreferenceUpdate>({
    mutationFn: async (payload) => {
      const res = await fetchWithCsrf('/api/profile/me/preferences/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Einstellungen konnten nicht aktualisiert werden');
      }
      const data = await res.json();
      return UserPreferenceSchema.parse(data);
    },
    onSuccess: (prefs) => {
      queryClient.setQueryData(['profile', 'preferences'], prefs);
    },
  });
}

// ==========================================================================
// My Ideas
// ==========================================================================

export function useMyIdeas() {
  return useQuery<MyIdea[]>({
    queryKey: ['profile', 'my-ideas'],
    queryFn: async () => {
      const res = await fetch('/api/profile/me/ideas/', { credentials: 'include' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return data.map((i: unknown) => MyIdeaSchema.parse(i));
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ==========================================================================
// My Groups
// ==========================================================================

export function useMyGroups() {
  return useQuery<UserGroup[]>({
    queryKey: ['profile', 'my-groups'],
    queryFn: async () => {
      const res = await fetch('/api/profile/me/groups/', { credentials: 'include' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return data.map((g: unknown) => UserGroupSchema.parse(g));
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyJoinRequests() {
  return useQuery<JoinRequest[]>({
    queryKey: ['profile', 'my-requests'],
    queryFn: async () => {
      const res = await fetch('/api/profile/me/requests/', { credentials: 'include' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return data.map((r: unknown) => JoinRequestSchema.parse(r));
    },
    staleTime: 2 * 60 * 1000,
  });
}

// ==========================================================================
// Groups (public)
// ==========================================================================

export function useGroups(query: string = '') {
  return useQuery<UserGroup[]>({
    queryKey: ['groups', query],
    queryFn: async () => {
      const params = query ? `?q=${encodeURIComponent(query)}` : '';
      const res = await fetch(`/api/groups/${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return data.map((g: unknown) => UserGroupSchema.parse(g));
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useGroupDetail(slug: string) {
  return useQuery<UserGroupDetail>({
    queryKey: ['groups', slug],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${slug}/`, { credentials: 'include' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return UserGroupDetailSchema.parse(data);
    },
    enabled: !!slug,
    staleTime: 2 * 60 * 1000,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation<UserGroup, Error, UserGroupCreate>({
    mutationFn: async (payload) => {
      const res = await fetchWithCsrf('/api/groups/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Gruppe konnte nicht erstellt werden');
      }
      const data = await res.json();
      return UserGroupSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'my-groups'] });
    },
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation<GroupMember | JoinRequest, Error, { slug: string; message?: string }>({
    mutationFn: async ({ slug, message }) => {
      const res = await fetchWithCsrf(`/api/groups/${slug}/join/`, {
        method: 'POST',
        body: JSON.stringify({ message: message || '' }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Beitritt fehlgeschlagen');
      }
      const data = await res.json();
      // Could be GroupMember (200) or JoinRequest (201)
      if ('role' in data) return GroupMemberSchema.parse(data);
      return JoinRequestSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['profile', 'my-requests'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useJoinByCode() {
  const queryClient = useQueryClient();
  return useMutation<GroupMember, Error, { slug: string; join_code: string }>({
    mutationFn: async ({ slug, join_code }) => {
      const res = await fetchWithCsrf(`/api/groups/${slug}/join-by-code/`, {
        method: 'POST',
        body: JSON.stringify({ join_code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Ungültiger Beitrittscode');
      }
      const data = await res.json();
      return GroupMemberSchema.parse(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { slug: string; membershipId: number }>({
    mutationFn: async ({ slug, membershipId }) => {
      const res = await fetchWithCsrf(`/api/groups/${slug}/members/${membershipId}/`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Austritt fehlgeschlagen');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
