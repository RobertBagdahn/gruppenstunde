/**
 * WebSocket hook for real-time shopping list collaboration.
 *
 * Manages a WebSocket connection to receive live updates about
 * item checks, additions, removals, and list changes.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ShoppingListBoard, ShoppingListItem } from '@/schemas/shoppingList';

export interface OptimisticCheckSnapshot {
  detail: unknown;
  board: unknown;
}
import { getGuestCredentials } from '@/lib/shoppingGuest';

export interface ShoppingListEvent {
  type: string;
  data: Record<string, unknown>;
  /** Public display name of the sending user (never an e-mail address). */
  sender: string;
  sender_id: number | null;
  timestamp: string;
}

interface UseShoppingListWebSocketOptions {
  /** Called when any event is received (for UI animations, etc.) */
  onEvent?: (event: ShoppingListEvent) => void;
}

interface UseShoppingListWebSocketReturn {
  /** Whether the WebSocket is currently connected */
  isConnected: boolean;
  /** Send an event to all connected users */
  sendEvent: (type: string, data: Record<string, unknown>) => void;
}

/** Production serves no WebSocket (gunicorn/WSGI); only a build with an ASGI backend switches the socket on. */
const WEBSOCKET_ENABLED = import.meta.env.VITE_SHOPPING_WEBSOCKET === 'true';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useShoppingListWebSocket(
  listId: number,
  options: UseShoppingListWebSocketOptions = {},
): UseShoppingListWebSocketReturn {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isConnected, setIsConnected] = useState(false);

  const { onEvent } = options;

  // Use a ref for handleMessage to avoid making it a dependency of `connect`.
  // This prevents infinite reconnect loops when onEvent changes on every render.
  const handleMessageRef = useRef<(event: ShoppingListEvent) => void>(() => {});

  const handleMessage = useCallback(
    (event: ShoppingListEvent) => {
      // Update TanStack Query cache based on event type
      switch (event.type) {
        case 'item.checked':
        case 'item.unchecked':
        case 'item.added':
        case 'item.removed':
        case 'item.updated':
        case 'list.updated':
          // Invalidate the shopping list detail query to refresh data
          queryClient.invalidateQueries({
            queryKey: ['shopping-list', listId],
          });
          // Also invalidate the list view for count updates
          queryClient.invalidateQueries({
            queryKey: ['shopping-lists'],
          });
          break;
      }

      // Call the optional event handler for UI feedback
      onEvent?.(event);
    },
    [queryClient, listId, onEvent],
  );

  // Keep the ref current so the WebSocket message handler always has the latest version
  handleMessageRef.current = handleMessage;

  const connect = useCallback(() => {
    if (!WEBSOCKET_ENABLED || !listId || listId <= 0) return;

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Guests have no session cookie; their device secret identifies them to the socket.
    const guest = getGuestCredentials(listId);
    const query = guest ? `?guest=${encodeURIComponent(guest.guestToken)}` : '';
    const url = `${protocol}//${host}/ws/shopping-lists/${listId}/${query}`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as ShoppingListEvent;
        // Always call via ref — never a stale closure
        handleMessageRef.current(data);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = (e) => {
      setIsConnected(false);
      wsRef.current = null;

      // Don't reconnect if closed intentionally or access denied
      if (e.code === 4403 || e.code === 1000) return;

      // Attempt to reconnect — `connect` is stable (only depends on listId)
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      // onclose will handle reconnection
    };

    wsRef.current = ws;
  // connect only depends on listId — handleMessage is accessed via ref
  }, [listId]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendEvent = useCallback(
    (type: string, data: Record<string, unknown>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type, data }));
      }
    },
    [],
  );

  return { isConnected, sendEvent };
}

/**
 * Optimistic update helper for checking/unchecking items.
 *
 * Updates the TanStack Query cache immediately before the server response,
 * and reverts on error.
 */
export function useOptimisticCheckItem(listId: number) {
  const queryClient = useQueryClient();

  const optimisticCheck = useCallback(
    (itemId: number, isChecked: boolean): OptimisticCheckSnapshot => {
      // Snapshot current data for rollback
      const previousData = queryClient.getQueryData(['shopping-list', listId]);
      const previousBoard = queryClient.getQueryData(['shopping-list-board', listId]);
      queryClient.setQueryData(
        ['shopping-list-board', listId],
        (old: ShoppingListBoard | undefined) => {
          if (!old) return old;
          const items = old.items.map((item) =>
            item.id === itemId
              ? { ...item, is_checked: isChecked, checked_by_name: isChecked ? (item.checked_by_name ?? null) : null }
              : item,
          );
          return { ...old, items, checked: items.filter((item) => item.is_checked).length };
        },
      );

      // Optimistically update the cache
      queryClient.setQueryData(
        ['shopping-list', listId],
        (old: Record<string, unknown> | undefined) => {
          if (!old || !Array.isArray((old as { items?: unknown[] }).items))
            return old;
          return {
            ...old,
            items: ((old as { items: ShoppingListItem[] }).items).map(
              (item: ShoppingListItem) =>
                item.id === itemId
                  ? {
                      ...item,
                      is_checked: isChecked,
                      // The checker's name comes from the server: if someone else was first, they stay.
                      checked_by_display_name: isChecked ? (item.checked_by_display_name ?? null) : null,
                      checked_at: isChecked ? (item.checked_at ?? new Date().toISOString()) : null,
                    }
                  : item,
            ),
          };
        },
      );

      return { detail: previousData, board: previousBoard };
    },
    [queryClient, listId],
  );

  const rollback = useCallback(
    (snapshot: OptimisticCheckSnapshot) => {
      queryClient.setQueryData(['shopping-list', listId], snapshot.detail);
      queryClient.setQueryData(['shopping-list-board', listId], snapshot.board);
    },
    [queryClient, listId],
  );

  return { optimisticCheck, rollback };
}
