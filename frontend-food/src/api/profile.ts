import { API_BASE_URL } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { PublicUserFoodProfileSchema, type PublicUserFoodProfile } from '@/schemas/profile';

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
