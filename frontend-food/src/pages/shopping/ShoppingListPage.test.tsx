// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ShoppingListSchema, type ShoppingList } from '@/schemas/shoppingList';
import ShoppingListPage from './ShoppingListPage';

const removeList = vi.fn();

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
];

vi.mock('@/api/shoppingLists', () => ({
  useShoppingLists: () => ({
    data: { items: lists, total: lists.length, page: 1, page_size: 20, total_pages: 1 },
    isPending: false,
    error: null,
  }),
  useCreateShoppingList: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteShoppingList: () => ({ mutate: removeList, isPending: false }),
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
