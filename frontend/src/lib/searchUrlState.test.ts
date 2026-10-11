import { describe, it, expect } from 'vitest';
import { filtersToSearchParams, searchParamsToFilters } from './searchUrlState';

describe('searchParamsToFilters', () => {
  it('keeps q from the URL', () => {
    const filters = searchParamsToFilters(new URLSearchParams('q=Stockbrot'));
    expect(filters.q).toBe('Stockbrot');
    expect(filters.page).toBe(1);
    expect(filters.sort).toBe('relevant');
  });

  it('parses tag_slugs as a comma-separated list', () => {
    const filters = searchParamsToFilters(new URLSearchParams('tag_slugs=natur-outdoor,lagerfeuer'));
    expect(filters.tag_slugs).toEqual(['natur-outdoor', 'lagerfeuer']);
  });

  it('ignores invalid page numbers', () => {
    expect(searchParamsToFilters(new URLSearchParams('page=abc')).page).toBe(1);
    expect(searchParamsToFilters(new URLSearchParams('page=3')).page).toBe(3);
  });
});

describe('filtersToSearchParams', () => {
  it('round-trips all URL filters', () => {
    const query = 'q=Wald&result_types=session%2Cgame&tag_slugs=natur-outdoor&sort=newest&page=2&scope=mine';
    const params = filtersToSearchParams(searchParamsToFilters(new URLSearchParams(query)));
    expect(params.toString()).toBe(query);
  });

  it('omits default values', () => {
    expect(filtersToSearchParams({ sort: 'relevant', page: 1, page_size: 20 }).toString()).toBe('');
  });
});
