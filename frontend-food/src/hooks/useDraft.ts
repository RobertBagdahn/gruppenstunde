/**
 * Persists form drafts in localStorage so they survive the OAuth redirect.
 * Drafts expire after 7 days and are removed after a successful save.
 */
import { useCallback, useEffect, useRef } from 'react';

const PREFIX = 'draft:';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESTORE_DRAFT_PARAM = 'restoreDraft';

interface StoredDraft<T> {
  savedAt: number;
  value: T;
}

export function saveDraft<T>(key: string, value: T): void {
  try {
    const payload: StoredDraft<T> = { savedAt: Date.now(), value };
    localStorage.setItem(PREFIX + key, JSON.stringify(payload));
  } catch {
    // Storage full or disabled: the draft is simply not kept.
  }
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > TTL_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

/** Appends `?restoreDraft=<key>` so the page offers the draft after the login round trip. */
export function withRestoreParam(path: string, key: string): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.set(RESTORE_DRAFT_PARAM, key);
  return url.pathname + url.search + url.hash;
}

/**
 * Keeps `value` mirrored to localStorage (debounced) while `enabled`.
 * Returns helpers to read or clear the draft explicitly.
 */
export function useDraft<T>(key: string, value: T, { enabled = true, delayMs = 500 } = {}) {
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => saveDraft(key, latest.current), delayMs);
    return () => window.clearTimeout(timer);
  }, [key, value, enabled, delayMs]);

  const flush = useCallback(() => saveDraft(key, latest.current), [key]);
  const load = useCallback(() => loadDraft<T>(key), [key]);
  const clear = useCallback(() => clearDraft(key), [key]);
  return { flush, load, clear };
}
