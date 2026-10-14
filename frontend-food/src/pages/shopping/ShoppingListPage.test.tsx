// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShoppingListSchema, type ShoppingList } from '@/schemas/shoppingList';
import ShoppingListPage from './ShoppingListPage';

const removeList = vi.fn();
const createFromMealPlan = vi.fn();

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

const lists = [
  list({ id: 1, name: 'ZZ-TEST Wocheneinkauf' }),
  list({ id: 2, name: 'Geteilte Liste', owner_id: 9, can_delete: false }),
  list({ id: 3, name: 'Planliste', source_type: 'meal_event', source_id: 41, source_status: 'changed' }),
  list({ id: 4, name: 'Aktuelle Planliste', source_type: 'meal_event', source_id: 42, source_status: 'current' }),
];

vi.mock('@/api/shoppingLists', () => ({
  useShoppingLists: () => ({
    data: { items: lists, total: lists.length, page: 1, page_size: 20, total_pages: 1 },
    isPending: false,
    error: null,
  }),
  useCreateShoppingList: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteShoppingList: () => ({ mutate: removeList, isPending: false }),
  useCreateFromMealPlan: () => ({ mutate: createFromMealPlan, isPending: false }),
}));
vi.mock('@/api/auth', () => ({ useCurrentUser: () => ({ isLoading: false, data: { id: 5 } }) }));

function renderPage() {
  return render(
    <MemoryRouter>
      <ShoppingListPage />
    </MemoryRouter>,
  );
}

describe('ShoppingListPage delete action', () => {
  beforeEach(() => {
    removeList.mockReset();
  });

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

describe('ShoppingListPage source freshness', () => {
  it('marks only lists whose plan changed and offers a new list for them', async () => {
    const user = userEvent.setup();
    renderPage();

    const notices = await screen.findAllByTestId('source-freshness-notice');
    expect(notices).toHaveLength(1);
    expect(within(notices[0]).getByText('Essensplan wurde seit Erstellung geändert')).toBeInTheDocument();

    await user.click(within(notices[0]).getByRole('button', { name: 'Neue Liste erstellen' }));
    expect(createFromMealPlan).toHaveBeenCalledWith({ mealPlanId: 41 }, expect.anything());
  });
});
