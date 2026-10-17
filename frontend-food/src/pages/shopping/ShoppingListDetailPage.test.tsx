// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import {
  ShoppingListBoardSchema,
  ShoppingListDetailSchema,
  type ShoppingListBoard,
  type ShoppingListDetail,
} from '@/schemas/shoppingList';
import ShoppingListDetailPage from './ShoppingListDetailPage';

const deleteItem = vi.fn();
const addItem = vi.fn();
const notifySuccess = vi.fn();
const createFromMealPlan = vi.fn();

let currentUser: { id: number; display_name: string } | null = { id: 5, display_name: 'Eule' };
let listQuery: { data?: ShoppingListDetail; isLoading: boolean; error: Error | null };
let boardQuery: { data?: ShoppingListBoard; isLoading: boolean; error: Error | null; refetch: () => void };

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
    items: [
      { id: 10, name: 'Klebeband', quantity_g: 0, unit: 'Stück', is_checked: true, sort_order: 4, can_delete: true },
    ],
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
  useCreateFromMealPlan: () => ({ mutate: createFromMealPlan, isPending: false }),
  useShoppingListSync: vi.fn(() => ({ pulseOverloaded: false })),
  useShoppingListWarnings: () => ({ data: [] }),
  useShoppingListBoard: () => boardQuery,
  useEnableSharing: () => ({ mutate: vi.fn(), isPending: false }),
  useDisableSharing: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveGuest: () => ({ mutate: vi.fn(), isPending: false }),
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
    boardQuery = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };
    deleteItem.mockReset();
    addItem.mockReset();
    notifySuccess.mockReset();
    createFromMealPlan.mockReset();
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

  describe('source freshness', () => {
    const planList = (status: 'current' | 'changed' | 'deleted' | null) =>
      ShoppingListDetailSchema.parse({
        ...detail(),
        source_type: 'meal_event',
        source_id: 41,
        source_status: status,
      });

    it('shows the hint with "Neue Liste erstellen" and opens the new list', async () => {
      const user = userEvent.setup();
      listQuery = { data: planList('changed'), isLoading: false, error: null };
      createFromMealPlan.mockImplementation((_vars: unknown, options: { onSuccess: (created: { id: number; warnings: unknown[] }) => void }) =>
        options.onSuccess({ id: 99, warnings: [] }),
      );
      render(
        <MemoryRouter initialEntries={['/shopping-lists/3']}>
          <Routes>
            <Route path="/shopping-lists/:id" element={<ShoppingListDetailPage />} />
            <Route path="/shopping-lists/99" element={<p>Neue Liste geöffnet</p>} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('Essensplan wurde seit Erstellung geändert')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Neue Liste erstellen' }));

      expect(createFromMealPlan).toHaveBeenCalledWith({ mealPlanId: 41 }, expect.anything());
      expect(await screen.findByText('Neue Liste geöffnet')).toBeInTheDocument();
    });

    it('shows no hint for a current list or without status', () => {
      listQuery = { data: planList('current'), isLoading: false, error: null };
      const { unmount } = renderPage();
      expect(screen.queryByTestId('source-freshness-notice')).not.toBeInTheDocument();
      unmount();

      listQuery = { data: planList(null), isLoading: false, error: null };
      renderPage();
      expect(screen.queryByTestId('source-freshness-notice')).not.toBeInTheDocument();
    });

    it('says the plan was deleted without offering an action', () => {
      listQuery = { data: planList('deleted'), isLoading: false, error: null };
      renderPage();

      expect(screen.getByText('Der Essensplan wurde gelöscht.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Neue Liste erstellen' })).not.toBeInTheDocument();
    });
  });

  describe('invitation link', () => {
    const guestList = () =>
      ShoppingListDetailSchema.parse({
        ...detail(),
        owner_id: 1,
        is_owner: false,
        can_manage: false,
        viewer_guest_id: 8,
        viewer_display_name: 'Anna',
        items: [{ id: 10, name: 'Brot', quantity_g: 0, is_checked: false, sort_order: 0, can_delete: false }],
      });

    it('lets a guest without account in and says who they are', () => {
      currentUser = null;
      window.localStorage.setItem(
        'inspi.shopping.guest.3',
        JSON.stringify({ guestToken: 't', name: 'Anna', shareToken: 's' }),
      );
      listQuery = { data: guestList(), isLoading: false, error: null };

      renderPage();

      expect(screen.getByTestId('shopping-guest-banner')).toHaveTextContent('Du bist als Anna dabei');
      expect(screen.queryByText('REWE-Export')).not.toBeInTheDocument();
      expect(screen.queryByTestId('shopping-share-toggle')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Einkaufsliste löschen' })).not.toBeInTheDocument();
      window.localStorage.clear();
    });

    it('offers the share section to owners and shows the link once sharing is on', () => {
      listQuery = {
        data: ShoppingListDetailSchema.parse({ ...detail(), can_manage: true, share_token: 'abc-123', guests: [{ id: 1, name: 'Ben', created_at: '2026-10-11T10:00:00Z' }] }),
        isLoading: false,
        error: null,
      };

      renderPage();

      expect(screen.getByTestId('shopping-share-url')).toHaveValue(`${window.location.origin}/shopping-lists/join/abc-123`);
      expect(screen.getByTestId('shopping-guest-1')).toHaveTextContent('Ben');
    });

    it('keeps the share section hidden for members who cannot manage', () => {
      renderPage();
      expect(screen.queryByTestId('shopping-share-section')).not.toBeInTheDocument();
    });
  });

  describe('shopping mode', () => {
    it('hides everything but the entries and remembers the choice', async () => {
      const user = userEvent.setup();
      listQuery = {
        data: ShoppingListDetailSchema.parse({ ...detail(), can_manage: true, share_token: 'abc' }),
        isLoading: false,
        error: null,
      };
      boardQuery = {
        data: ShoppingListBoardSchema.parse({
          id: 1,
          name: 'Wocheneinkauf',
          stamp: 'x',
          can_edit: true,
          total: 1,
          checked: 0,
          items: [{ id: 1, name: 'Klebeband' }],
        }),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      renderPage();
      expect(screen.getByTestId('shopping-share-section')).toBeInTheDocument();

      await user.click(screen.getByTestId('shopping-shop-mode-toggle'));

      expect(screen.queryByTestId('shopping-share-section')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Einkaufsliste löschen' })).not.toBeInTheDocument();
      expect(screen.getByText('Klebeband')).toBeInTheDocument();
      expect(window.localStorage.getItem('inspi.shopping.shopMode')).toBe('1');
      window.localStorage.clear();
    });
  });
});
