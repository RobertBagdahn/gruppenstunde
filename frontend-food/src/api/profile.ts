import { API_BASE_URL, fetchWithCsrf, getCsrfToken } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PublicUserFoodProfileSchema,
  UserProfileSchema,
  ProfilePictureResponseSchema,
  type PublicUserFoodProfile,
  type UserProfile,
  type UserProfileUpdate,
} from '@/schemas/profile';

export function usePublicProfile(slug: string) {
  return useQuery<PublicUserFoodProfile>({
    queryKey: ['profile', 'public', slug],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/profile/by-slug/${encodeURIComponent(slug)}/`, {
        credentials: 'include',
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error('Profil nicht gefunden');
        throw new Error('Fehler beim Laden des Profils');
      }
      return PublicUserFoodProfileSchema.parse(await res.json());
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useMyProfile() {
  return useQuery<UserProfile>({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/profile/me/`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Fehler beim Laden des Profils');
      return UserProfileSchema.parse(await res.json());
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UserProfileUpdate) => {
      const res = await fetchWithCsrf(`${API_BASE_URL}/api/profile/me/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || err?.[0] || 'Fehler beim Speichern');
      }
      return UserProfileSchema.parse(await res.json());
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(['profile', 'me'], profile);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useUploadProfilePicture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('picture', file);
      const res = await fetch(`${API_BASE_URL}/api/profile/me/picture/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRFToken': getCsrfToken() },
        body: formData,
      });
      if (!res.ok) throw new Error('Fehler beim Hochladen');
      return ProfilePictureResponseSchema.parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
  });
}

export function useDeleteProfilePicture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetchWithCsrf(`${API_BASE_URL}/api/profile/me/picture/`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Fehler beim Entfernen');
      return ProfilePictureResponseSchema.parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
  });
}


