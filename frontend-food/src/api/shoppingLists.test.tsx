// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ApiError } from '@/lib/api';
import { ShoppingListDetailSchema, type ShoppingListDetail } from '@/schemas/shoppingList';
import { useDeleteShoppingListItem, useShoppingList, useShoppingLists } from './shoppingLists';

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

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('useShoppingList errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('raises the German backend detail instead of the raw HTTP status text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(404, { detail: 'Einkaufsliste nicht gefunden' })));

    const { result } = renderHook(() => useShoppingList(7), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(404);
    expect(result.current.error?.message).toBe('Einkaufsliste nicht gefunden');
  });
});

describe('useDeleteShoppingListItem', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function cachedList(): ShoppingListDetail {
    return ShoppingListDetailSchema.parse({
      id: 3,
      name: 'Lagereinkauf',
      owner_id: 1,
      source_type: 'manual',
      created_at: '2026-10-11T10:00:00Z',
      updated_at: '2026-10-11T10:00:00Z',
      items: [
        { id: 10, name: 'Klebeband', quantity_g: 0, is_checked: true, sort_order: 4 },
        { id: 11, name: 'Mehl', quantity_g: 500, is_checked: false, sort_order: 5 },
      ],
    });
  }

  function setup() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(['shopping-list', 3], cachedList());
    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useDeleteShoppingListItem(3), { wrapper: localWrapper });
    const cachedIds = () => client.getQueryData<ShoppingListDetail>(['shopping-list', 3])?.items.map((item) => item.id);
    return { result, cachedIds };
  }

  it('removes the entry from the list before the server answers', async () => {
    let answer: (response: Response) => void = () => {};
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => (
      init?.method === 'DELETE'
        ? new Promise<Response>((resolve) => { answer = resolve; })
        : Promise.resolve(jsonResponse(200, cachedList()))
    )));
    const { result, cachedIds } = setup();

    act(() => result.current.mutate(10));

    await waitFor(() => expect(cachedIds()).toEqual([11]));
    answer(jsonResponse(200, { success: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('puts the entry back when the delete fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(403, { detail: 'Keine Berechtigung zum Bearbeiten' })));
    const { result, cachedIds } = setup();

    act(() => result.current.mutate(10));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(cachedIds()).toEqual([10, 11]);
    expect(result.current.error?.message).toBe('Keine Berechtigung zum Bearbeiten');
  });
});
