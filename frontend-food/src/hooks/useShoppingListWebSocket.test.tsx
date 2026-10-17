import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

async function renderSocketHook() {
  vi.resetModules();
  const { useShoppingListWebSocket } = await import('./useShoppingListWebSocket');
  return renderHook(() => useShoppingListWebSocket(13), { wrapper });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('useShoppingListWebSocket switch', () => {
  it('opens no connection by default (production serves no WebSocket)', async () => {
    const socket = vi.fn();
    vi.stubGlobal('WebSocket', socket);

    const { result } = await renderSocketHook();

    expect(socket).not.toHaveBeenCalled();
    expect(result.current.isConnected).toBe(false);
  });

  it('connects when VITE_SHOPPING_WEBSOCKET is true', async () => {
    vi.stubEnv('VITE_SHOPPING_WEBSOCKET', 'true');
    const socket = vi.fn((_url: string) => ({ close: vi.fn(), send: vi.fn(), readyState: 0 }));
    vi.stubGlobal('WebSocket', socket);

    await renderSocketHook();

    expect(socket).toHaveBeenCalledTimes(1);
    expect(socket.mock.calls[0][0]).toContain('/ws/shopping-lists/13/');
  });
});
