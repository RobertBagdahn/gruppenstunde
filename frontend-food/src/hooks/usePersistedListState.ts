import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useCurrentUser } from '@/api/auth';
import {
  hasAnyListState,
  readListState,
  writeListState,
  type ListKey,
  type StoredListState,
} from '@/lib/listStateStorage';

type ListSchema = z.ZodObject<z.ZodRawShape>;
type RawState = z.infer<ListSchema>;

/** State with the fields that have defaults typed as always present. */
export type ListState<S extends ListSchema, D> = Omit<z.infer<S>, keyof D> & {
  [K in keyof D & keyof z.infer<S>]-?: NonNullable<z.infer<S>[K]>;
};

export interface ListStateUpdateOptions {
  /** Replace the history entry, e.g. while typing a search. */
  replace?: boolean;
}

export interface UsePersistedListStateOptions<S extends ListSchema, D extends Partial<z.infer<S>>> {
  key: ListKey;
  /** Module-level constant: every field optional with `.catch(undefined)`. */
  schema: S;
  /** Module-level constant; default values never appear in the URL. */
  defaults: D;
  /** Fields that stay URL-only (e.g. `page`). */
  persistExclude?: readonly (keyof z.infer<S>)[];
  /** Fields that are not counted as active filters (e.g. `page`, `view`). */
  countExclude?: readonly (keyof z.infer<S>)[];
  /** Returns state from an older storage format once; the caller deletes it. */
  migrateLegacy?: () => StoredListState | null;
  /**
   * Whether stored state is restored into a URL without state params
   * (default true). Disable it where the stored state does not apply, e.g.
   * on other tabs of the same page, so it does not leak into their URLs.
   */
  restore?: boolean;
}

function unwrap(field: z.ZodTypeAny): z.ZodTypeAny {
  if (field instanceof z.ZodCatch) return unwrap(field._def.innerType);
  if (field instanceof z.ZodOptional || field instanceof z.ZodNullable) return unwrap(field.unwrap());
  if (field instanceof z.ZodDefault) return unwrap(field._def.innerType);
  return field;
}

function toRaw(value: unknown): string | string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.length > 0 ? value.map(String) : undefined;
  return String(value);
}

function sameRaw(a: string | string[] | undefined, b: string | string[] | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function usePersistedListState<S extends ListSchema, D extends Partial<z.infer<S>>>(
  options: UsePersistedListStateOptions<S, D>,
) {
  const { key, schema, defaults, persistExclude = [], countExclude = [], migrateLegacy, restore = true } = options;
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const userId = user?.id ?? null;

  const fieldKeys = useMemo(() => Object.keys(schema.shape), [schema]);
  const arrayKeys = useMemo(
    () => new Set(fieldKeys.filter((field) => unwrap(schema.shape[field]) instanceof z.ZodArray)),
    [fieldKeys, schema],
  );

  /** Validates raw values and returns only valid, non-default fields. */
  const normalize = useCallback((raw: Record<string, unknown>): StoredListState => {
    const parsed: RawState = schema.parse(raw);
    const result: StoredListState = {};
    for (const field of fieldKeys) {
      const value = toRaw(parsed[field]);
      if (value === undefined || sameRaw(value, toRaw((defaults as RawState)[field]))) continue;
      result[field] = value;
    }
    return result;
  }, [defaults, fieldKeys, schema]);

  const persistable = useCallback((raw: StoredListState): StoredListState => {
    const excluded = new Set<string>(persistExclude as readonly string[]);
    return Object.fromEntries(Object.entries(raw).filter(([field]) => !excluded.has(field)));
  }, [persistExclude]);

  const urlRaw = useMemo(() => {
    const raw: Record<string, unknown> = {};
    for (const field of fieldKeys) {
      if (arrayKeys.has(field)) {
        const values = searchParams.getAll(field);
        if (values.length > 0) raw[field] = values;
      } else {
        const value = searchParams.get(field);
        if (value !== null) raw[field] = value;
      }
    }
    return normalize(raw);
  }, [arrayKeys, fieldKeys, normalize, searchParams]);
  const urlRawKey = JSON.stringify(urlRaw);
  const hasStateParams = fieldKeys.some((field) => searchParams.has(field));

  const state = useMemo(() => {
    const parsed: RawState = schema.parse(urlRaw);
    const merged: RawState = { ...defaults };
    for (const [field, value] of Object.entries(parsed)) {
      if (value !== undefined) merged[field] = value;
    }
    return merged as ListState<S, D>;
  // urlRawKey captures every change of urlRaw.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlRawKey, defaults, schema]);

  const writeUrl = useCallback((raw: StoredListState, replace: boolean) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const field of fieldKeys) next.delete(field);
      for (const [field, value] of Object.entries(raw)) {
        if (Array.isArray(value)) value.forEach((item) => next.append(field, item));
        else next.set(field, value);
      }
      return next;
    }, { replace });
  }, [fieldKeys, setSearchParams]);

  const setState = useCallback((next: Partial<z.infer<S>>, updateOptions: ListStateUpdateOptions = {}) => {
    const raw = normalize(next);
    writeUrl(raw, updateOptions.replace ?? false);
    if (!userLoading) writeListState(userId, key, persistable(raw));
  }, [key, normalize, persistable, userId, userLoading, writeUrl]);

  const patch = useCallback((partial: Partial<z.infer<S>>, updateOptions: ListStateUpdateOptions = {}) => {
    setState({ ...(state as Partial<z.infer<S>>), ...partial }, updateOptions);
  }, [setState, state]);

  const reset = useCallback(() => setState({}), [setState]);

  // A URL with state (shared link, browser back) becomes the stored state.
  useEffect(() => {
    if (userLoading || !hasStateParams) return;
    writeListState(userId, key, persistable(urlRaw));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStateParams, key, urlRawKey, userId, userLoading]);

  // Without state in the URL, restore the stored state once the user is known.
  // Lists with state in the URL, or without anything stored, do not need to wait
  // for the user: their queries start immediately (food-loading-states).
  const [noStoredState] = useState(() => !restore || !hasAnyListState(key));
  const [restoreChecked, setRestoreChecked] = useState(false);
  const migrateLegacyRef = useRef(migrateLegacy);
  migrateLegacyRef.current = migrateLegacy;
  useEffect(() => {
    if (userLoading) return;
    if (!hasStateParams) {
      if (restore) {
        const legacy = migrateLegacyRef.current?.() ?? null;
        const stored = { ...(legacy ?? {}), ...(readListState(userId, key) ?? {}) };
        const restored = persistable(normalize(stored));
        if (Object.keys(restored).length > 0) writeUrl(restored, true);
        writeListState(userId, key, restored);
      }
    }
    setRestoreChecked(true);
  }, [hasStateParams, key, normalize, persistable, restore, userId, userLoading, writeUrl]);

  const activeCount = useMemo(() => {
    const excluded = new Set<string>(countExclude as readonly string[]);
    return Object.entries(urlRaw)
      .filter(([field]) => !excluded.has(field))
      .reduce((count, [, value]) => count + (Array.isArray(value) ? value.length : 1), 0);
  }, [countExclude, urlRaw]);

  return {
    state,
    setState,
    patch,
    reset,
    activeCount,
    /** True once the stored state was applied; enable list queries only then. */
    restored: hasStateParams || noStoredState || (!userLoading && restoreChecked),
  };
}

/**
 * Local search input that commits debounced (history-replacing) updates and
 * follows external changes of the committed value (reset, back navigation).
 */
export function useDebouncedSearchInput(committed: string, commit: (value: string) => void, delay = 300) {
  const [input, setInput] = useState(committed);
  const lastCommittedRef = useRef(committed);
  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    if (committed === lastCommittedRef.current) return;
    lastCommittedRef.current = committed;
    setInput(committed);
  }, [committed]);

  useEffect(() => {
    if (input === lastCommittedRef.current) return;
    const timer = setTimeout(() => {
      lastCommittedRef.current = input;
      commitRef.current(input);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, input]);

  const submit = useCallback(() => {
    lastCommittedRef.current = input;
    commitRef.current(input);
  }, [input]);

  return { input, setInput, submit };
}
