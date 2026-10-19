/**
 * TanStack Query hooks for shopping stores.
 * MUST stay in sync with backend/shopping/api_trips.py (store_router)
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/api';
import { PaginatedStoresSchema, StoreInputSchema, StoreSchema, type StoreInput } from '@/schemas/shoppingStore';
import { fetchJson, postJson } from './shoppingLists';

const API_BASE = `${API_BASE_URL}/api/shopping-stores`;

export interface StoreQuery {
  search?: string;
  /** Adds the stores used by trips of this event (for its team). */
  eventSlug?: string;
  page?: number;
  pageSize?: number;
}

export function useStores({ search = '', eventSlug, page = 1, pageSize = 20 }: StoreQuery = {}, enabled = true) {
  return useQuery({
    enabled,
    placeholderData: keepPreviousData,
    queryKey: ['shopping-stores', search, eventSlug ?? null, page, pageSize] as const,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
      if (search) params.set('search', search);
      if (eventSlug) params.set('event_slug', eventSlug);
      return fetchJson(`${API_BASE}/?${params.toString()}`, PaginatedStoresSchema);
    },
  });
}

/** Returns the existing store when the name is already taken (case-insensitive), so callers can just select it. */
export function useCreateStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: StoreInput) => postJson(`${API_BASE}/`, StoreInputSchema.parse(input), StoreSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-stores'] });
    },
  });
}
