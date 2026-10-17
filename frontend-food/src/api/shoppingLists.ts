/**
 * TanStack Query hooks for the Shopping List API.
 * MUST stay in sync with backend/shopping/api.py
 */
import { API_BASE_URL, ApiError, fetchWithCsrf, parseApiResponse } from '@/lib/api';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { z } from 'zod';
import { guestHeaders } from '@/lib/shoppingGuest';
import { isOverloadError, withOverloadRetry } from '@/lib/queryRetry';
import {
  PaginatedShoppingListsSchema,
  SharedListJoinSchema,
  SharedListPreviewSchema,
  ShoppingListPulseSchema,
  ShoppingListShareSchema,
  ShoppingListSchema,
  ShoppingListDetailSchema,
  ShoppingListBoardSchema,
  type ShoppingListBoard,
  ShoppingListWarningsSchema,
  ShoppingListItemSchema,
  ShoppingListCollaboratorSchema,
  type ShoppingListDetail,
} from '@/schemas/shoppingList';

const API_BASE = `${API_BASE_URL}/api/shopping-lists`;

// --- Fetch helpers (ApiError with the German backend detail, never raw status texts) ---

/**
 * `listId` adds the guest header of an invitation-link visitor; members authenticate by session cookie.
 */
async function fetchJson<T extends z.ZodTypeAny>(url: string, schema: T, listId?: number): Promise<z.output<T>> {
  const headers = listId ? guestHeaders(listId) : {};
  return parseApiResponse(await fetch(url, { credentials: 'include', headers }), schema);
}

async function postJson<T extends z.ZodTypeAny>(
  url: string,
  body: unknown,
  schema: T,
  listId?: number,
): Promise<z.output<T>> {
  const headers = listId ? guestHeaders(listId) : {};
  return parseApiResponse(await fetchWithCsrf(url, { method: 'POST', body: JSON.stringify(body), headers }), schema);
}

async function patchJson<T extends z.ZodTypeAny>(
  url: string,
  body: unknown,
  schema: T,
  listId?: number,
): Promise<z.output<T>> {
  const headers = listId ? guestHeaders(listId) : {};
  return parseApiResponse(await fetchWithCsrf(url, { method: 'PATCH', body: JSON.stringify(body), headers }), schema);
}

async function deleteJson(url: string, listId?: number): Promise<void> {
  const headers = listId ? guestHeaders(listId) : {};
  await parseApiResponse(await fetchWithCsrf(url, { method: 'DELETE', headers }));
}

// --- Shopping List CRUD hooks ---

export interface ShoppingListQuery {
  q?: string;
  sort?: 'newest' | 'oldest' | 'name_asc';
  mine?: boolean;
  sourceType?: 'manual' | 'recipe' | 'meal_event';
  sourceId?: number;
}

export function useShoppingLists(
  page = 1,
  pageSize = 20,
  query: ShoppingListQuery = {},
  options: { enabled?: boolean } = {},
) {
  const { q = '', sort = 'newest', mine = false, sourceType, sourceId } = query;
  return useQuery({
    enabled: options.enabled ?? true,
    // Keep the previous page visible while the next one loads (food-loading-states).
    placeholderData: keepPreviousData,
    queryKey: ['shopping-lists', page, pageSize, q, sort, mine, sourceType ?? null, sourceId ?? null] as const,
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort,
      });
      if (q) params.set('q', q);
      if (mine) params.set('mine', 'true');
      if (sourceType) params.set('source_type', sourceType);
      if (sourceId !== undefined) params.set('source_id', String(sourceId));
      return fetchJson(`${API_BASE}/?${params.toString()}`, PaginatedShoppingListsSchema);
    },
  });
}

/** Quantity plausibility warnings of a meal-plan list; fetched only where they are shown. */
export function useShoppingListWarnings(id: number, enabled = true) {
  return useQuery({
    queryKey: ['shopping-list-warnings', id] as const,
    queryFn: () => fetchJson(`${API_BASE}/${id}/warnings/`, ShoppingListWarningsSchema, id),
    enabled: enabled && id > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/** Full detail of one entry, loaded only when its details are opened. */
export function useShoppingListItem(listId: number, itemId: number | null) {
  return useQuery({
    queryKey: ['shopping-list-item', listId, itemId] as const,
    queryFn: () => fetchJson(`${API_BASE}/${listId}/items/${itemId}/`, ShoppingListItemSchema, listId),
    enabled: itemId !== null && listId > 0,
  });
}

/** Compact board of a list: the screen's minimal payload, cached per list state on the server. */
export function useShoppingListBoard(id: number, enabled = true) {
  return useQuery({
    queryKey: ['shopping-list-board', id] as const,
    queryFn: () => fetchJson(`${API_BASE}/${id}/board/`, ShoppingListBoardSchema, id),
    enabled: enabled && id > 0,
  });
}

export function useShoppingList(id: number, enabled = true) {
  return useQuery({
    queryKey: ['shopping-list', id] as const,
    queryFn: () => fetchJson(`${API_BASE}/${id}/`, ShoppingListDetailSchema, id),
    enabled: enabled && id > 0,
  });
}

const PULSE_INTERVAL_MS = 5000;
/** With a live socket the marker is only a safety net (e.g. for revoked access, which a socket cannot report). */
const PULSE_INTERVAL_CONNECTED_MS = 20000;

/** After this long without any change the poll slows down; any change, focus or own action speeds it up again. */
export const PULSE_IDLE_AFTER_MS = 2 * 60 * 1000;
const PULSE_INTERVAL_IDLE_MS = 15000;
const PULSE_INTERVAL_MAX_MS = 60000;

/** Poll interval: fast while people are active, slow when nothing has happened for a while. */
export function pulseIntervalMs(idleMs: number, socketConnected: boolean, failures = 0): number {
  const base = socketConnected
    ? PULSE_INTERVAL_CONNECTED_MS
    : idleMs >= PULSE_IDLE_AFTER_MS
      ? PULSE_INTERVAL_IDLE_MS
      : PULSE_INTERVAL_MS;
  // Backend struggling: every consecutive failure doubles the wait (up to a minute) instead of adding load.
  return Math.min(base * 2 ** failures, PULSE_INTERVAL_MAX_MS);
}

/** Overload or outage; 401/404 mean lost access and are handled elsewhere. */
function isPulseFailure(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 429 || error.status >= 500 || error.code === 'network');
}

/**
 * Keeps a list current without WebSockets (production serves none): polls a tiny change marker
 * and reloads the list only when it differs from the one the loaded list carries.
 * Pauses in background tabs and catches up when the tab regains focus.
 */
export function useShoppingListSync(listId: number, loadedStamp: string | undefined, socketConnected: boolean) {
  const queryClient = useQueryClient();
  const lastActivity = useRef(Date.now());
  const failures = useRef(0);
  const { data, error } = useQuery({
    queryKey: ['shopping-list-pulse', listId] as const,
    queryFn: async () => {
      try {
        const pulse = await fetchJson(`${API_BASE}/${listId}/pulse/`, ShoppingListPulseSchema, listId);
        failures.current = 0;
        return pulse;
      } catch (cause) {
        failures.current = isPulseFailure(cause) ? failures.current + 1 : 0;
        throw cause;
      }
    },
    enabled: listId > 0 && !!loadedStamp,
    refetchInterval: () => pulseIntervalMs(Date.now() - lastActivity.current, socketConnected, failures.current),
    refetchOnWindowFocus: 'always',
    staleTime: 0,
    retry: false,
  });
  // Any change (ours or someone else's) and returning to the tab count as activity.
  useEffect(() => {
    lastActivity.current = Date.now();
  }, [loadedStamp]);
  useEffect(() => {
    const wake = () => {
      if (document.visibilityState === 'visible') lastActivity.current = Date.now();
    };
    document.addEventListener('visibilitychange', wake);
    return () => document.removeEventListener('visibilitychange', wake);
  }, []);
  // Access ended (link renewed, guest removed, list deleted): let the list itself report it.
  const accessLost = error instanceof ApiError && (error.status === 404 || error.status === 401);
  useEffect(() => {
    if (accessLost) void queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
  }, [accessLost, listId, queryClient]);
  useEffect(() => {
    if (data && loadedStamp && data.stamp !== loadedStamp) {
      void queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
      void queryClient.invalidateQueries({ queryKey: ['shopping-list-board', listId] });
      void queryClient.invalidateQueries({ queryKey: ['shopping-list-item', listId] });
    }
  }, [data, loadedStamp, listId, queryClient]);
  return { pulseOverloaded: isOverloadError(error) };
}

// --- Invitation link (join without an account) ---

export function useSharedListPreview(token: string, listIdForGuest?: number) {
  return useQuery({
    queryKey: ['shopping-list-shared', token] as const,
    queryFn: () => fetchJson(`${API_BASE}/shared/${token}/`, SharedListPreviewSchema, listIdForGuest),
    enabled: token.length > 0,
    retry: false,
    staleTime: 0,
  });
}

export function useJoinSharedList(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, listId }: { name: string; listId?: number }) =>
      postJson(`${API_BASE}/shared/${token}/join/`, { name }, SharedListJoinSchema, listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

export function useEnableSharing(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: 'enable' | 'regenerate') =>
      postJson(
        `${API_BASE}/${listId}/share/${action === 'regenerate' ? 'regenerate/' : ''}`,
        {},
        ShoppingListShareSchema,
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] }),
  });
}

export function useDisableSharing(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => deleteJson(`${API_BASE}/${listId}/share/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] }),
  });
}

export function useRemoveGuest(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guestId: number) => deleteJson(`${API_BASE}/${listId}/guests/${guestId}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] }),
  });
}

export function useCreateShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string }) =>
      postJson(`${API_BASE}/`, payload, ShoppingListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

export function useUpdateShoppingList(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string }) =>
      patchJson(`${API_BASE}/${id}/`, payload, ShoppingListSchema),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      queryClient.invalidateQueries({ queryKey: ['shopping-list', id] });
    },
  });
}

export function useDeleteShoppingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJson(`${API_BASE}/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

// --- Item mutation hooks ---

export function useAddShoppingListItem(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      name: string;
      quantity_g?: number;
      unit?: string;
      retail_section_id?: number | null;
      ingredient_id?: number | null;
      sort_order?: number;
      note?: string;
      is_checked?: boolean;
    }) => postJson(`${API_BASE}/${listId}/items/`, payload, ShoppingListItemSchema, listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['shopping-list-board', listId] });
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

export function useUpdateShoppingListItem(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      itemId,
      ...payload
    }: {
      itemId: number;
      name?: string;
      quantity_g?: number;
      unit?: string;
      retail_section_id?: number | null;
      is_checked?: boolean;
      sort_order?: number;
      note?: string;
      /** true: "Ich hole das"; false: release. */
      claimed?: boolean;
    }) => {
      const send = () => patchJson(`${API_BASE}/${listId}/items/${itemId}/`, payload, ShoppingListItemSchema, listId);
      // Setting a check or a claim to an explicit value gives the same result when repeated.
      return typeof payload.is_checked === 'boolean' || typeof payload.claimed === 'boolean'
        ? withOverloadRetry(send)
        : send();
    },
    onSuccess: (item) => {
      void queryClient.invalidateQueries({ queryKey: ['shopping-list-item', listId] });
      // The server's answer is the truth (e.g. the first person to check stays the checker).
      queryClient.setQueryData<ShoppingListDetail>(['shopping-list', listId], (old) =>
        old ? { ...old, items: old.items.map((i) => (i.id === item.id ? { ...i, ...item } : i)) } : old,
      );
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
      queryClient.invalidateQueries({ queryKey: ['shopping-list-board', listId] });
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

/** Removes the entry from the cached list and board right away and puts it back if the DELETE fails. */
export function useDeleteShoppingListItem(listId: number) {
  const queryClient = useQueryClient();
  const queryKey = ['shopping-list', listId] as const;
  const boardKey = ['shopping-list-board', listId] as const;
  return useMutation({
    mutationFn: (itemId: number) =>
      deleteJson(`${API_BASE}/${listId}/items/${itemId}/`, listId),
    onMutate: async (itemId: number) => {
      await Promise.all([queryClient.cancelQueries({ queryKey }), queryClient.cancelQueries({ queryKey: boardKey })]);
      const previous = queryClient.getQueryData<ShoppingListDetail>(queryKey);
      const previousBoard = queryClient.getQueryData<ShoppingListBoard>(boardKey);
      if (previous) {
        queryClient.setQueryData<ShoppingListDetail>(queryKey, {
          ...previous,
          items: previous.items.filter((item) => item.id !== itemId),
        });
      }
      if (previousBoard) {
        queryClient.setQueryData<ShoppingListBoard>(boardKey, {
          ...previousBoard,
          items: previousBoard.items.filter((item) => item.id !== itemId),
          total: previousBoard.total - 1,
          checked: previousBoard.items.filter((item) => item.id !== itemId && item.is_checked).length,
        });
      }
      return { previous, previousBoard };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      if (context?.previousBoard) queryClient.setQueryData(boardKey, context.previousBoard);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: boardKey });
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

// --- Collaborator mutation hooks ---

export function useAddCollaborator(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { user_id: number; role?: string }) =>
      postJson(
        `${API_BASE}/${listId}/collaborators/`,
        payload,
        ShoppingListCollaboratorSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
    },
  });
}

export function useUpdateCollaborator(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ collabId, role }: { collabId: number; role: string }) =>
      patchJson(
        `${API_BASE}/${listId}/collaborators/${collabId}/`,
        { role },
        ShoppingListCollaboratorSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
    },
  });
}

export function useRemoveCollaborator(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collabId: number) =>
      deleteJson(`${API_BASE}/${listId}/collaborators/${collabId}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-list', listId] });
    },
  });
}

// --- Export hooks ---

export function useCreateFromRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      recipeId,
      portions = 1,
      includeConsumables = true,
    }: {
      recipeId: number;
      portions?: number;
      includeConsumables?: boolean;
    }) =>
      postJson(
        `${API_BASE}/from-recipe/${recipeId}/`,
        { portions, include_consumables: includeConsumables },
        ShoppingListDetailSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

export function useCreateFromMealPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      mealPlanId,
      includeConsumables = true,
    }: {
      mealPlanId: number;
      includeConsumables?: boolean;
    }) =>
      postJson(
        `${API_BASE}/from-meal-plan/${mealPlanId}/?include_consumables=${includeConsumables}`,
        {},
        ShoppingListDetailSchema,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });
}

// --- REWE Export ---

import { ReweExportTokenResponseSchema } from '@/schemas/shoppingList';

export function useReweExportToken(listId: number) {
  return useMutation({
    mutationFn: () =>
      postJson(
        `${API_BASE}/${listId}/rewe-export-token/`,
        {},
        ReweExportTokenResponseSchema,
      ),
  });
}
