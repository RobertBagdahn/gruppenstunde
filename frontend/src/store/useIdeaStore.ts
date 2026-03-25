/**
 * Zustand store for client-side idea state.
 * Server state is managed by TanStack Query – this store is only for UI state.
 * Filters are synced to URL search params for shareable/bookmarkable URLs.
 */
import { create } from 'zustand';
import type { IdeaFilter } from '@/schemas/idea';

interface IdeaState {
  filters: Partial<IdeaFilter>;
  setFilter: (key: keyof IdeaFilter, value: unknown) => void;
  resetFilters: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  initFromUrlParams: (params: URLSearchParams) => void;
}

const defaultFilters: Partial<IdeaFilter> = {
  sort: 'newest',
  page: 1,
  page_size: 20,
};

/** Serialize filters to URLSearchParams */
export function filtersToSearchParams(filters: Partial<IdeaFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.idea_type?.length) {
    params.set('idea_type', filters.idea_type.join(','));
  }
  if (filters.difficulty) params.set('difficulty', filters.difficulty);
  if (filters.costs_rating) params.set('costs_rating', filters.costs_rating);
  if (filters.execution_time) params.set('execution_time', filters.execution_time);
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.scout_level_ids?.length) {
    params.set('scout_level_ids', filters.scout_level_ids.join(','));
  }
  if (filters.tag_slugs?.length) {
    params.set('tag_slugs', filters.tag_slugs.join(','));
  }
  return params;
}

/** Parse URLSearchParams into filters */
function searchParamsToFilters(params: URLSearchParams): Partial<IdeaFilter> {
  const filters: Partial<IdeaFilter> = { ...defaultFilters };
  const q = params.get('q');
  if (q) filters.q = q;
  const ideaType = params.get('idea_type');
  if (ideaType) filters.idea_type = ideaType.split(',');
  const difficulty = params.get('difficulty');
  if (difficulty) filters.difficulty = difficulty;
  const costsRating = params.get('costs_rating');
  if (costsRating) filters.costs_rating = costsRating;
  const executionTime = params.get('execution_time');
  if (executionTime) filters.execution_time = executionTime;
  const sort = params.get('sort');
  if (sort) filters.sort = sort;
  const page = params.get('page');
  if (page) filters.page = Number(page);
  const scoutLevelIds = params.get('scout_level_ids');
  if (scoutLevelIds) filters.scout_level_ids = scoutLevelIds.split(',').map(Number);
  const tagSlugs = params.get('tag_slugs');
  if (tagSlugs) filters.tag_slugs = tagSlugs.split(',');
  return filters;
}

export const useIdeaStore = create<IdeaState>((set) => ({
  filters: { ...defaultFilters },
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value, page: key === 'page' ? (value as number) : 1 },
    })),
  resetFilters: () => set({ filters: { ...defaultFilters }, searchQuery: '' }),
  searchQuery: '',
  setSearchQuery: (q) =>
    set((state) => ({
      searchQuery: q,
      filters: { ...state.filters, q: q || undefined, page: 1 },
    })),
  initFromUrlParams: (params) =>
    set(() => {
      const filters = searchParamsToFilters(params);
      return { filters, searchQuery: filters.q ?? '' };
    }),
}));
