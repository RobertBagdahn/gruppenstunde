import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, loadDraft, saveDraft, withRestoreParam } from './useDraft';

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('draft storage', () => {
  it('round-trips a draft and clears it', () => {
    saveDraft('recipe:new', { title: 'Suppe' });
    expect(loadDraft<{ title: string }>('recipe:new')).toEqual({ title: 'Suppe' });
    clearDraft('recipe:new');
    expect(loadDraft('recipe:new')).toBeNull();
  });

  it('drops drafts older than 7 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T10:00:00Z'));
    saveDraft('ingredient:new', { name: 'Hafer' });
    vi.setSystemTime(new Date('2026-01-09T10:00:00Z'));
    expect(loadDraft('ingredient:new')).toBeNull();
    expect(localStorage.getItem('draft:ingredient:new')).toBeNull();
  });

  it('adds the restore parameter to the return path', () => {
    expect(withRestoreParam('/recipes/new?step=basis', 'recipe:new')).toBe(
      '/recipes/new?step=basis&restoreDraft=recipe%3Anew',
    );
  });
});
