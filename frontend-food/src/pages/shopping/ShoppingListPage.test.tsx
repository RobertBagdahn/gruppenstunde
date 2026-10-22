// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShoppingListSchema, type ShoppingList } from '@/schemas/shoppingList';
import { ShoppingEventSchema, type ShoppingEvent } from '@/schemas/shoppingTrip';
import ShoppingListPage from './ShoppingListPage';

const { removeList, listQueries, state } = vi.hoisted(() => ({
  removeList: vi.fn(),
  listQueries: [] as Array<Record<string, unknown>>,
  state: {
    user: { id: 5 } as { id: number } | null,
    lists: [] as unknown[],
    invited: [] as unknown[],
    events: [] as unknown[],
    eventCalls: [] as unknown[][],
  },
}));

function list(overrides: Partial<ShoppingList>): ShoppingList {
  return ShoppingListSchema.parse({
    id: 1,
    name: 'Liste',
    owner_id: 5,
    source_type: 'manual',
    created_at: '2026-10-11T10:00:00Z',
    updated_at: '2026-10-11T10:00:00Z',
    can_edit: true,
    can_delete: true,
    ...overrides,
  });
}

function event(overrides: Partial<ShoppingEvent>): ShoppingEvent {
  return ShoppingEventSchema.parse({ id: 1, slug: 'sommerlager', name: 'Sommerlager', ...overrides });
}

vi.mock('@/api/shoppingLists', () => ({
  useShoppingLists: (_page: number, _size: number, query: Record<string, unknown>) => {
    listQueries.push(query);
    const items = query.invitedTrips ? state.invited : state.lists;
    return { data: { items, total: items.length, page: 1, page_size: 20, total_pages: 1 }, isPending: false, error: null };
  },
  useCreateShoppingList: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteShoppingList: () => ({ mutate: removeList, isPending: false }),
}));
vi.mock('@/api/shoppingTrips', () => ({
  useShoppingEvents: (...args: unknown[]) => {
    state.eventCalls.push(args);
    return {
      data: { items: state.events, total: state.events.length, page: 1, page_size: 20, total_pages: 1 },
      isPending: false,
      isError: false,
    };
  },
  usePlanDiff: () => ({ isPending: true }),
  useApplyPlanDiff: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('@/api/auth', () => ({ useCurrentUser: () => ({ isLoading: false, data: state.user }) }));
vi.mock('@/components/shopping/RecipePurchaseDialog', () => ({
  default: ({ open }: { open: boolean }) => (open ? <div role="dialog">Rezept-Einkauf</div> : null),
}));

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="url">{location.search}</output>;
}

function renderPage(path = '/shopping-lists') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ShoppingListPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  removeList.mockReset();
  listQueries.length = 0;
  state.user = { id: 5 };
  state.eventCalls = [];
  state.invited = [];
  state.events = [];
  state.lists = [
    list({ id: 1, name: 'ZZ-TEST Wocheneinkauf' }),
    list({ id: 2, name: 'Geteilte Liste', owner_id: 9, can_delete: false }),
    list({ id: 3, name: 'Planliste', source_type: 'meal_event', source_id: 41, source_status: 'changed' }),
    list({ id: 4, name: 'Aktuelle Planliste', source_type: 'meal_event', source_id: 42, source_status: 'current' }),
  ];
  window.localStorage.clear();
});

describe('event selection', () => {
  it('shows an event card with period, number of trips and the next trip', async () => {
    state.events = [
      event({
        start_date: '2026-10-20T08:00:00Z',
        end_date: '2026-10-25T08:00:00Z',
        trips_count: 3,
        next_trip: { list_id: 5, store_name: 'Rewe', scheduled_at: '2026-10-24T08:00:00Z' },
      }),
    ];
    renderPage();

    const card = await screen.findByRole('link', { name: /Sommerlager/ });
    expect(card).toHaveAttribute('href', '/shopping-lists/events/sommerlager');
    expect(within(card).getByText('3 Einkäufe')).toBeInTheDocument();
    expect(within(card).getByText(/20\.10\. – 25\.10\.2026/)).toBeInTheDocument();
    expect(within(card).getByText(/Nächster: Rewe · Sa \d{2}:\d{2}/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Für welches Event kaufst du ein?' })).toBeInTheDocument();
  });

  it('points to the meal plans when there is no event with a plan', async () => {
    renderPage();

    expect(await screen.findByText('Noch kein Event mit Essensplan')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Zu den Essensplänen/ })).toHaveAttribute('href', '/meal-plans');
  });

  it('keeps past events out by default and puts include_past into the URL when asked', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(state.eventCalls[state.eventCalls.length - 1]?.[2]).toBe(false);

    await user.click(await screen.findByRole('button', { name: 'Vergangene Events zeigen' }));

    expect(screen.getByTestId('url')).toHaveTextContent('include_past=true');
    expect(state.eventCalls[state.eventCalls.length - 1]?.[2]).toBe(true);
  });

  it('asks anonymous visitors to log in', () => {
    state.user = null;
    renderPage();

    expect(screen.getByText('Melde dich an, um deine Einkaufslisten zu sehen.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kostenlos anmelden/ })).toBeInTheDocument();
  });
});

describe('lists without event and invitations', () => {
  it('asks the server for lists without event only', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Einkaufslisten ohne Event' })).toBeInTheDocument();
    expect(listQueries.some((query) => query.withoutEvent === true)).toBe(true);
    expect(screen.getByText('ZZ-TEST Wocheneinkauf')).toBeInTheDocument();
  });

  it('shows the trips the user was invited to with event, shop and time', async () => {
    state.invited = [
      list({ id: 20, name: 'Rewe · Sa 10:00', source_type: 'event_trip', event_id: 1, event_name: 'Sommerlager', store_name: 'Rewe', scheduled_at: '2026-10-24T08:00:00Z', can_delete: false }),
    ];
    renderPage();

    const section = await screen.findByRole('region', { name: 'Einkäufe, zu denen du eingeladen bist' });
    const link = within(section).getByRole('link', { name: /Rewe · Sa 10:00/ });
    expect(link).toHaveAttribute('href', '/shopping-lists/20');
    expect(within(section).getByText('Sommerlager')).toBeInTheDocument();
  });

  it('hides the invited section when there is nothing to show', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Einkaufslisten ohne Event' });
    expect(screen.queryByText('Einkäufe, zu denen du eingeladen bist')).not.toBeInTheDocument();
  });

  it('offers a free list and a purchase from recipes', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Einkauf aus Rezepten' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Rezept-Einkauf');
  });
});

describe('delete action', () => {
  it('offers delete only for lists the user may delete', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: 'Einkaufsliste „ZZ-TEST Wocheneinkauf“ löschen' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Einkaufsliste „Geteilte Liste“ löschen' })).not.toBeInTheDocument();
  });

  it('names the list in the dialog and deletes it on confirm', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Einkaufsliste „ZZ-TEST Wocheneinkauf“ löschen' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Einkaufsliste „ZZ-TEST Wocheneinkauf“ löschen?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Löschen' }));
    expect(removeList).toHaveBeenCalledWith(1, expect.anything());
  });
});

describe('source freshness', () => {
  it('marks only lists whose plan changed, and old plan lists only get the hint', async () => {
    renderPage();

    const notices = await screen.findAllByTestId('source-freshness-notice');
    expect(notices).toHaveLength(1);
    expect(within(notices[0]).getByText('Essensplan wurde seit Erstellung geändert')).toBeInTheDocument();
    expect(within(notices[0]).queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers the difference for changed event trips', async () => {
    state.lists = [
      list({ id: 6, name: 'Metro Fr', source_type: 'event_trip', event_id: 1, event_slug: 'sommerlager', source_status: 'changed', trip_status: 'created' }),
    ];
    renderPage();

    const notice = await screen.findByTestId('source-freshness-notice');
    expect(within(notice).getByRole('button', { name: 'Änderungen ansehen' })).toBeInTheDocument();
  });
});
