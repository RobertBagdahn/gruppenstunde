// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { getApiErrorMessage } from '@/lib/api';
import { useCreateRule, useCreateTrip, useLinkMealPlanEvent, useMaterializeTrip, useTripPlan } from './shoppingTrips';
import { useCreateStore } from './shoppingStores';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const listSummary = {
  id: 9, name: 'Metro · Sa 17.10. 09:00', owner_id: 1, source_type: 'event_trip', created_at: 'x', updated_at: 'x',
  can_edit: true, can_delete: true, event_id: 1, event_slug: 'sommerlager', trip_status: 'planned',
};

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
}

const keysOf = (spy: ReturnType<typeof setup>['invalidate']) => spy.mock.calls.map(([filters]) => filters?.queryKey);

describe('shopping trip hooks', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('loads the plan of an event', async () => {
    const fetchMock = vi.fn(async () => json({ event_id: 1, event_slug: 'sommerlager', event_name: 'Sommerlager' }));
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = setup();

    const { result } = renderHook(() => useTripPlan('sommerlager'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toContain('/api/shopping-events/sommerlager/plan/');
    expect(result.current.data?.trips).toEqual([]);
  });

  it('creates a trip and refreshes plan, lists and overview', async () => {
    const fetchMock = vi.fn(async () => json(listSummary, 201));
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper, invalidate } = setup();

    const { result } = renderHook(() => useCreateTrip('sommerlager'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ store_id: 2, scheduled_at: '2026-10-17T09:00:00+02:00' });
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/shopping-events/sommerlager/trips/');
    expect(JSON.parse(String(init.body))).toEqual({ store_id: 2, scheduled_at: '2026-10-17T09:00:00+02:00' });
    expect(keysOf(invalidate)).toEqual(expect.arrayContaining([['shopping-plan', 'sommerlager'], ['shopping-lists'], ['shopping-events']]));
  });

  it('shows the German message when the time is missing', async () => {
    vi.stubGlobal('fetch', vi.fn());
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateTrip('sommerlager'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ store_id: 2, scheduled_at: '' }).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getApiErrorMessage(result.current.error)).not.toMatch(/undefined|Zod/);
  });

  it('turns a 409 on "Liste erstellen" into the backend text and keeps the cache untouched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ detail: 'Diese Liste wurde schon erstellt.', code: 'conflict' }, 409)));
    const { wrapper, invalidate } = setup();

    const { result } = renderHook(() => useMaterializeTrip('sommerlager'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(9).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getApiErrorMessage(result.current.error)).toBe('Diese Liste wurde schon erstellt.');
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('invalidates the list detail and board after freezing a trip', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ ...listSummary, items: [], trip_status: 'created' })));
    const { wrapper, invalidate } = setup();

    const { result } = renderHook(() => useMaterializeTrip('sommerlager'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(9);
    });

    expect(keysOf(invalidate)).toEqual(
      expect.arrayContaining([['shopping-list', 9], ['shopping-list-board', 9], ['shopping-plan-diff', 9]]),
    );
  });

  it('posts a rule for the event', async () => {
    const fetchMock = vi.fn(async () => json({ id: 1, target_id: 9, ingredient_id: 7, name: 'Hackfleisch' }, 201));
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper, invalidate } = setup();

    const { result } = renderHook(() => useCreateRule('sommerlager'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ target_id: 9, ingredient_id: 7, quantity: 3000 });
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/shopping-events/sommerlager/rules/');
    expect(JSON.parse(String(init.body))).toMatchObject({ target_id: 9, ingredient_id: 7, quantity: 3000 });
    expect(keysOf(invalidate)).toContainEqual(['shopping-plan', 'sommerlager']);
  });

  it('reports the conflict when the plan already belongs to an event', async () => {
    const fetchMock = vi.fn(async () => json({ detail: 'Dieser Essensplan gehört schon zu einem Event', code: 'conflict' }, 409));
    vi.stubGlobal('fetch', fetchMock);
    const { wrapper } = setup();

    const { result } = renderHook(() => useLinkMealPlanEvent(5), { wrapper });
    await act(async () => {
      await result.current.mutateAsync(3).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/meal-plans/5/event/');
    expect(init.method).toBe('PUT');
    expect(getApiErrorMessage(result.current.error)).toBe('Dieser Essensplan gehört schon zu einem Event');
  });

  it('creates a store and refreshes the choices', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ id: 4, name: 'DM', created_at: 'x' }, 201)));
    const { wrapper, invalidate } = setup();

    const { result } = renderHook(() => useCreateStore(), { wrapper });
    let created: { name: string } | undefined;
    await act(async () => {
      created = await result.current.mutateAsync({ name: 'DM' });
    });

    expect(created?.name).toBe('DM');
    expect(keysOf(invalidate)).toContainEqual(['shopping-stores']);
  });
});
