/**
 * WebSocket hook for real-time shopping list collaboration.
 *
 * Manages a WebSocket connection to receive live updates about
 * item checks, additions, removals, and list changes.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ShoppingListItem } from '@/schemas/shoppingList';

interface ShoppingListEvent {
  type: string;
  data: Record<string, unknown>;
  sender: string;
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

  const connect = useCallback(() => {
    if (!listId || listId <= 0) return;

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/shopping-lists/${listId}/`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as ShoppingListEvent;
        handleMessage(data);
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = (e) => {
      setIsConnected(false);
      wsRef.current = null;

      // Don't reconnect if closed intentionally or access denied
      if (e.code === 4403 || e.code === 1000) return;

      // Attempt to reconnect
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    ws.onerror = () => {
      // onclose will handle reconnection
    };

    wsRef.current = ws;
  }, [listId, handleMessage]);

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
    (itemId: number, isChecked: boolean, username: string) => {
      // Snapshot current data for rollback
      const previousData = queryClient.getQueryData(['shopping-list', listId]);

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
                      checked_by_username: isChecked ? username : null,
                      checked_at: isChecked ? new Date().toISOString() : null,
                    }
                  : item,
            ),
          };
        },
      );

      return previousData;
    },
    [queryClient, listId],
  );

  const rollback = useCallback(
    (previousData: unknown) => {
      queryClient.setQueryData(['shopping-list', listId], previousData);
    },
    [queryClient, listId],
  );

  return { optimisticCheck, rollback };
}
