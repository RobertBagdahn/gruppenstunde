/**
 * The first recipes of the existing sort "Meistgesehen". Only the ids are used: the recipe list
 * marks them with the "Beliebt" sticker (food-design-system: Sticker-Quellen).
 */
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/api';
import { PaginatedRecipesSchema } from '@/schemas/recipe';
import { POPULAR_TOP_N } from '@/lib/stickers';

export function usePopularRecipeIds(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['recipes', 'popular-top', POPULAR_TOP_N] as const,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/recipes/?sort=popular&page=1&page_size=${POPULAR_TOP_N}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Meistgesehen konnte nicht geladen werden (${res.status})`);
      const data = PaginatedRecipesSchema.parse(await res.json());
      return new Set(data.items.map((item) => item.id));
    },
    enabled: options.enabled ?? true,
    staleTime: 10 * 60 * 1000,
  });
}
