// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { ShoppingListDetailSchema, type ShoppingListDetail } from '@/schemas/shoppingList';
import ShoppingListDetailPage from './ShoppingListDetailPage';

const deleteItem = vi.fn();
const addItem = vi.fn();
const notifySuccess = vi.fn();

let currentUser: { id: number; display_name: string } | null = { id: 5, display_name: 'Eule' };
let listQuery: { data?: ShoppingListDetail; isLoading: boolean; error: Error | null };

function detail(): ShoppingListDetail {
  return ShoppingListDetailSchema.parse({
    id: 3,
    name: 'Lagereinkauf',
    owner_id: 5,
    source_type: 'manual',
    created_at: '2026-10-11T10:00:00Z',
    updated_at: '2026-10-11T10:00:00Z',
    can_edit: true,
    is_owner: true,
    items: [{ id: 10, name: 'Klebeband', quantity_g: 0, unit: 'Stück', is_checked: true, sort_order: 4 }],
  });
}

vi.mock('@/api/auth', () => ({
  useCurrentUser: () => ({ isLoading: false, data: currentUser }),
}));
vi.mock('@/api/shoppingLists', () => ({
  useShoppingList: () => ({ ...listQuery, refetch: vi.fn() }),
  useUpdateShoppingListItem: () => ({ mutate: vi.fn() }),
  useAddShoppingListItem: () => ({ mutate: addItem, isPending: false }),
  useDeleteShoppingListItem: () => ({ mutate: deleteItem }),
  useDeleteShoppingList: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateShoppingList: () => ({ mutate: vi.fn() }),
}));
vi.mock('@/hooks/useShoppingListWebSocket', () => ({
  useShoppingListWebSocket: () => ({ isConnected: false, sendEvent: vi.fn() }),
  useOptimisticCheckItem: () => ({ optimisticCheck: vi.fn(), rollback: vi.fn() }),
}));
vi.mock('@/components/shopping/CollaboratorManager', () => ({ default: () => null }));
vi.mock('@/components/shopping/KitchenReminderSection', () => ({ default: () => null }));
vi.mock('@/components/shopping/ReweExportButton', () => ({ default: () => null }));
vi.mock('@/lib/notify', () => ({
  UNDO_DURATION_MS: 6000,
  notify: { success: (...args: unknown[]) => notifySuccess(...args), error: vi.fn() },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/shopping-lists/3']}>
      <Routes>
        <Route path="/shopping-lists/:id" element={<ShoppingListDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ShoppingListDetailPage', () => {
  beforeEach(() => {
    currentUser = { id: 5, display_name: 'Eule' };
    listQuery = { data: detail(), isLoading: false, error: null };
    deleteItem.mockReset();
    addItem.mockReset();
    notifySuccess.mockReset();
  });

  it('asks anonymous visitors to log in instead of showing a raw error', () => {
    currentUser = null;
    listQuery = { isLoading: false, error: new ApiError(401, 'Unauthorized', { detail: 'Bitte melde dich an.' }) };

    renderPage();

    expect(screen.getByText('Melde dich an, um diese Einkaufsliste zu sehen.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kostenlos anmelden/ })).toBeInTheDocument();
    expect(screen.queryByText(/API error/)).not.toBeInTheDocument();
  });

  it('shows a German not-found message for a foreign list', () => {
    listQuery = { isLoading: false, error: new ApiError(404, 'Not Found', { detail: 'Einkaufsliste nicht gefunden' }) };

    renderPage();

    expect(screen.getByText('Einkaufsliste nicht gefunden')).toBeInTheDocument();
    expect(screen.queryByText(/Not Found/)).not.toBeInTheDocument();
  });

  it('restores a deleted entry with its checked state and position', async () => {
    const user = userEvent.setup();
    deleteItem.mockImplementation((_id: number, options: { onSuccess: () => void }) => options.onSuccess());
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Eintrag „Klebeband“ löschen' }));

    expect(deleteItem).toHaveBeenCalledWith(10, expect.anything());
    const [, toastOptions] = notifySuccess.mock.calls[0] as [string, { action: { onClick: () => void } }];
    toastOptions.action.onClick();
    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Klebeband', unit: 'Stück', is_checked: true, sort_order: 4 }),
      expect.anything(),
    );
  });
});
