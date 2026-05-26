/**
 * Persisted Defaults — store and retrieve last-used filter/sort values in localStorage.
 *
 * Keys are namespaced per page to avoid collisions:
 *   "inspi:defaults:<pageKey>:<paramName>" → value
 */

const PREFIX = 'inspi:defaults';

function storageKey(pageKey: string, paramName: string): string {
  return `${PREFIX}:${pageKey}:${paramName}`;
}

/** Save a default value for a page + param combination. */
export function setPersistedDefault(pageKey: string, paramName: string, value: string): void {
  try {
    if (value) {
      localStorage.setItem(storageKey(pageKey, paramName), value);
    } else {
      localStorage.removeItem(storageKey(pageKey, paramName));
    }
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

/** Get a previously saved default value, or return the provided fallback. */
export function getPersistedDefault(pageKey: string, paramName: string, fallback = ''): string {
  try {
    return localStorage.getItem(storageKey(pageKey, paramName)) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Clear all persisted defaults (e.g. on logout). */
export function clearPersistedDefaults(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // silently ignore
  }
}
