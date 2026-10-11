/**
 * URL <-> filter mapping for the unified search page (`/search`).
 * The URL is the single source of truth for search filters.
 */
import type { UnifiedSearchFilter } from '@/schemas/search';

export function filtersToSearchParams(filters: Partial<UnifiedSearchFilter>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.result_types?.length) {
    params.set('result_types', filters.result_types.join(','));
  }
  if (filters.tag_slugs?.length) params.set('tag_slugs', filters.tag_slugs.join(','));
  if (filters.sort && filters.sort !== 'relevant') params.set('sort', filters.sort);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.scope === 'mine') params.set('scope', 'mine');
  return params;
}

export function searchParamsToFilters(params: URLSearchParams): Partial<UnifiedSearchFilter> {
  const filters: Partial<UnifiedSearchFilter> = {
    sort: 'relevant',
    page: 1,
    page_size: 20,
  };
  const q = params.get('q');
  if (q) filters.q = q;
  const resultTypes = params.get('result_types');
  if (resultTypes) filters.result_types = resultTypes.split(',');
  const tagSlugs = params.get('tag_slugs');
  if (tagSlugs) filters.tag_slugs = tagSlugs.split(',').filter(Boolean);
  const sort = params.get('sort');
  if (sort) filters.sort = sort;
  const page = Number(params.get('page'));
  if (Number.isInteger(page) && page > 1) filters.page = page;
  const scope = params.get('scope');
  if (scope === 'mine') filters.scope = 'mine';
  return filters;
}
