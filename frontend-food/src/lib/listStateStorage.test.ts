// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearListState,
  listStateStorageKey,
  readListState,
  takeLegacyValue,
  writeListState,
} from './listStateStorage';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('listStateStorage', () => {
  it('builds separate keys per user and for anonymous visitors', () => {
    expect(listStateStorageKey(7, 'recipes')).toBe('inspi-food:list-state:v1:7:recipes');
    expect(listStateStorageKey(null, 'recipes')).toBe('inspi-food:list-state:v1:anon:recipes');
  });

  it('keeps states of different users apart', () => {
    writeListState(1, 'recipes', { origin: ['mine'] });

    expect(readListState(1, 'recipes')).toEqual({ origin: ['mine'] });
    expect(readListState(2, 'recipes')).toBeNull();
    expect(readListState(null, 'recipes')).toBeNull();
  });

  it('removes the entry for an empty state', () => {
    writeListState(1, 'recipes', { sort: 'newest' });
    writeListState(1, 'recipes', {});

    expect(localStorage.getItem(listStateStorageKey(1, 'recipes'))).toBeNull();
  });

  it('clears the stored state', () => {
    writeListState(1, 'ingredients', { status: 'draft' });
    clearListState(1, 'ingredients');

    expect(readListState(1, 'ingredients')).toBeNull();
  });

  it('ignores unreadable and malformed entries', () => {
    localStorage.setItem(listStateStorageKey(1, 'recipes'), '{kaputt');
    expect(readListState(1, 'recipes')).toBeNull();

    localStorage.setItem(listStateStorageKey(1, 'recipes'), JSON.stringify({ sort: 3, q: 'Suppe' }));
    expect(readListState(1, 'recipes')).toEqual({ q: 'Suppe' });
  });

  it('works without errors when localStorage throws', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('private mode');
    });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('private mode');
    });

    expect(() => writeListState(1, 'recipes', { q: 'Suppe' })).not.toThrow();
    expect(readListState(1, 'recipes')).toBeNull();
    expect(takeLegacyValue('recipe-search-view')).toBeNull();
  });

  it('takes a legacy value once', () => {
    localStorage.setItem('recipe-search-view', 'table');

    expect(takeLegacyValue('recipe-search-view')).toBe('table');
    expect(takeLegacyValue('recipe-search-view')).toBeNull();
  });
});
