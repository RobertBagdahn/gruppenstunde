// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useShoppingLists } from './shoppingLists';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function mockListResponse() {
  const fetchMock = vi.fn(async () => new Response(
    JSON.stringify({ items: [], total: 0, page: 1, page_size: 20, total_pages: 1 }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  ));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function requestedUrl(fetchMock: ReturnType<typeof mockListResponse>): URL {
  const [url] = fetchMock.mock.calls[0] as unknown as [string];
  return new URL(url, 'http://localhost');
}

describe('useShoppingLists', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('asks the server to sort and filter so every page is consistent', async () => {
    const fetchMock = mockListResponse();

    const { result } = renderHook(
      () => useShoppingLists(2, 20, { q: 'lager', sort: 'name_asc', mine: true }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const params = requestedUrl(fetchMock).searchParams;
    expect(params.get('page')).toBe('2');
    expect(params.get('q')).toBe('lager');
    expect(params.get('sort')).toBe('name_asc');
    expect(params.get('mine')).toBe('true');
  });

  it('defaults to newest first without the owner filter', async () => {
    const fetchMock = mockListResponse();

    const { result } = renderHook(() => useShoppingLists(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const params = requestedUrl(fetchMock).searchParams;
    expect(params.get('sort')).toBe('newest');
    expect(params.has('mine')).toBe(false);
  });
});
