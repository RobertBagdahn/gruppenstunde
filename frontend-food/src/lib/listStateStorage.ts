/**
 * Browser storage for list filters, separated per user.
 *
 * Values are stored in their URL form (`string` or `string[]`); the list
 * schema validates them again when they come back through the URL.
 */
export type ListKey =
  | 'recipes'
  | 'ingredients'
  | 'meal-plans'
  | 'shopping-lists'
  | 'ingredient-stats'
  | 'data-quality-ingredients'
  | 'data-quality-buffet-catalog'
  | 'meal-plan-detail';

export type StoredListState = Record<string, string | string[]>;

export function listStateStorageKey(userId: number | null, listKey: ListKey): string {
  return `inspi-food:list-state:v1:${userId ?? 'anon'}:${listKey}`;
}

function isStoredValue(value: unknown): value is string | string[] {
  return typeof value === 'string' || (Array.isArray(value) && value.every((item) => typeof item === 'string'));
}

export function readListState(userId: number | null, listKey: ListKey): StoredListState | null {
  try {
    const raw = localStorage.getItem(listStateStorageKey(userId, listKey));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const entries = Object.entries(parsed).filter(([, value]) => isStoredValue(value));
    return entries.length > 0 ? Object.fromEntries(entries) as StoredListState : null;
  } catch {
    return null;
  }
}

/**
 * Whether any user (or the anonymous visitor) has stored state for this list.
 * Lists without stored state can load right away instead of waiting for the
 * current user (food-loading-states).
 */
export function hasAnyListState(listKey: ListKey): boolean {
  try {
    const suffix = `:${listKey}`;
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith('inspi-food:list-state:v1:') && key.endsWith(suffix)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Writes the state; an empty state removes the entry. */
export function writeListState(userId: number | null, listKey: ListKey, state: StoredListState): void {
  try {
    const key = listStateStorageKey(userId, listKey);
    if (Object.keys(state).length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode, quota): URL state keeps working.
  }
}

export function clearListState(userId: number | null, listKey: ListKey): void {
  writeListState(userId, listKey, {});
}

/** Reads and removes a legacy single-value key. */
export function takeLegacyValue(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    if (value !== null) localStorage.removeItem(key);
    return value;
  } catch {
    return null;
  }
}
