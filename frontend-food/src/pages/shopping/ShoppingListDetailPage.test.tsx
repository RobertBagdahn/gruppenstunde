// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { saveGuestCredentials } from '@/lib/shoppingGuest';
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
const fetchItem = vi.fn();
const notifyError = vi.fn();
const refetchSession = vi.fn();

let currentUser: { id: number; display_name: string } | null = { id: 5, display_name: 'Eule' };
let sessionError: Error | null = null;
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
  useCurrentUser: () => ({ isLoading: false, data: currentUser, error: sessionError, refetch: refetchSession }),
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
  fetchShoppingListItem: (...args: unknown[]) => fetchItem(...args),
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
  notify: {
    success: (...args: unknown[]) => notifySuccess(...args),
    error: (...args: unknown[]) => notifyError(...args),
  },
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
    fetchItem.mockReset();
    notifyError.mockReset();
    refetchSession.mockReset();
    sessionError = null;
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

    it('restores an entry deleted from the board with its grams and ingredient', async () => {
      const user = userEvent.setup();
      boardQuery = {
        data: ShoppingListBoardSchema.parse({
          id: 3,
          name: 'Wocheneinkauf',
          stamp: 'x',
          can_edit: true,
          total: 1,
          checked: 0,
          items: [{ id: 1, name: 'Klebeband', can_delete: true }],
        }),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      fetchItem.mockResolvedValue({
        id: 1,
        name: 'Klebeband',
        quantity_g: 250,
        unit: 'g',
        note: 'stark',
        retail_section_id: 4,
        ingredient_id: 77,
        sort_order: 2,
        is_checked: false,
      });
      deleteItem.mockImplementation((_id: number, options: { onSuccess: () => void }) => options.onSuccess());
      window.localStorage.setItem('inspi.shopping.shopMode', '1');
      renderPage();

      await user.click(screen.getByRole('button', { name: 'Klebeband löschen' }));

      await vi.waitFor(() => expect(notifySuccess).toHaveBeenCalled());
      expect(fetchItem).toHaveBeenCalledWith(3, 1);
      const [, toastOptions] = notifySuccess.mock.calls[0] as [string, { action: { onClick: () => void } }];
      toastOptions.action.onClick();
      expect(addItem).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Klebeband', quantity_g: 250, ingredient_id: 77, retail_section_id: 4, sort_order: 2 }),
        expect.anything(),
      );
      window.localStorage.clear();
    });

    it('still deletes when the full entry cannot be fetched, without an undo', async () => {
      const user = userEvent.setup();
      boardQuery = {
        data: ShoppingListBoardSchema.parse({
          id: 3,
          name: 'Wocheneinkauf',
          stamp: 'x',
          can_edit: true,
          total: 1,
          checked: 0,
          items: [{ id: 1, name: 'Klebeband', can_delete: true }],
        }),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      fetchItem.mockRejectedValue(new Error('offline'));
      window.localStorage.setItem('inspi.shopping.shopMode', '1');
      renderPage();

      await user.click(screen.getByRole('button', { name: 'Klebeband löschen' }));

      await vi.waitFor(() => expect(deleteItem).toHaveBeenCalledWith(1, expect.anything()));
      expect(notifySuccess).not.toHaveBeenCalled();
      window.localStorage.clear();
    });
  });

  describe('search', () => {
    const searchList = (overrides: Record<string, unknown> = {}) =>
      ShoppingListDetailSchema.parse({
        ...detail(),
        ...overrides,
        items: [
          { id: 1, name: 'Möhren', quantity_g: 500, unit: 'g', retail_section_name: 'Obst und Gemüse', is_checked: false, sort_order: 1, can_delete: true },
          { id: 2, name: 'Brötchen', quantity_g: 0, unit: 'Stück', retail_section_name: 'Backwaren', is_checked: false, sort_order: 2, can_delete: true },
          { id: 3, name: 'Milch', quantity_g: 1000, unit: 'g', retail_section_name: 'Kühlregal', is_checked: true, sort_order: 3, can_delete: true },
        ],
      });

    function renderPageAt(path: string) {
      return render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/shopping-lists/:id" element={<ShoppingListDetailPage />} />
          </Routes>
        </MemoryRouter>,
      );
    }

    beforeEach(() => {
      window.localStorage.clear();
      listQuery = { data: searchList(), isLoading: false, error: null };
    });

    it('narrows the entries, hides empty sections and counts the matches', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByTestId('shopping-search-input'), 'mohr');

      expect(screen.getByText('Möhren')).toBeInTheDocument();
      expect(screen.queryByText('Brötchen')).not.toBeInTheDocument();
      expect(screen.queryByText('Backwaren')).not.toBeInTheDocument();
      expect(screen.getByTestId('shopping-search-count')).toHaveTextContent('1 Treffer');
    });

    it('finds checked entries and keeps them checked', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByTestId('shopping-search-input'), 'milch');

      expect(screen.getByText('Milch')).toBeInTheDocument();
      expect(screen.getByTestId('shopping-item-3')).toHaveTextContent('Milch');
    });

    it('restores the search term and filter from the URL', () => {
      renderPageAt('/shopping-lists/3?q=milch');

      expect(screen.getByTestId('shopping-search-input')).toHaveValue('milch');
      expect(screen.getByText('Milch')).toBeInTheDocument();
      expect(screen.queryByText('Möhren')).not.toBeInTheDocument();
    });

    it('clears the term with the button and with Escape', async () => {
      const user = userEvent.setup();
      renderPage();
      const input = screen.getByTestId('shopping-search-input');

      await user.type(input, 'milch');
      await user.click(screen.getByTestId('shopping-search-clear'));
      expect(input).toHaveValue('');
      expect(screen.getByText('Möhren')).toBeInTheDocument();

      await user.type(input, 'milch');
      await user.keyboard('{Escape}');
      expect(input).toHaveValue('');
    });

    it('does not send a request while typing', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      renderPage();

      await user.type(screen.getByTestId('shopping-search-input'), 'mohr');

      expect(fetchSpy).not.toHaveBeenCalled();
      fetchSpy.mockRestore();
    });

    it('keeps the search visible and large in shopping mode', async () => {
      const user = userEvent.setup();
      boardQuery = {
        data: ShoppingListBoardSchema.parse({
          id: 3,
          name: 'Lagereinkauf',
          stamp: 'stamp-1',
          items: [{ id: 10, name: 'Klebeband', is_checked: false, sort_order: 1, retail_section_name: 'Haushalt' }],
        }),
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      };
      renderPage();

      await user.click(screen.getByTestId('shopping-shop-mode-toggle'));

      expect(screen.getByTestId('shopping-search-input')).toHaveClass('h-12', 'text-emphasis');
    });

    it('offers to add the term to editors when nothing matches', async () => {
      const user = userEvent.setup();
      renderPage();

      await user.type(screen.getByTestId('shopping-search-input'), '  senf ');

      expect(screen.getByTestId('shopping-search-empty')).toHaveTextContent('Nichts gefunden für „senf“');
      await user.click(screen.getByTestId('shopping-search-add'));
      expect(addItem).toHaveBeenCalledWith({ name: 'senf' }, expect.anything());
      expect(screen.getByTestId('shopping-search-input')).toHaveValue('  senf ');
    });

    it('shows a guest the same add button', async () => {
      const user = userEvent.setup();
      currentUser = null;
      saveGuestCredentials(3, { guestToken: 'guest-secret', name: 'Anna', shareToken: 'share' });
      listQuery = {
        data: searchList({ is_owner: false, viewer_guest_id: 7, viewer_display_name: 'Anna' }),
        isLoading: false,
        error: null,
      };
      renderPage();

      await user.type(screen.getByTestId('shopping-search-input'), 'senf');

      expect(screen.getByTestId('shopping-search-add')).toBeInTheDocument();
    });

    it('shows a viewer only the hint, never the add button', async () => {
      const user = userEvent.setup();
      listQuery = { data: searchList({ can_edit: false, is_owner: false }), isLoading: false, error: null };
      renderPage();

      await user.type(screen.getByTestId('shopping-search-input'), 'senf');

      expect(screen.getByTestId('shopping-search-empty')).toHaveTextContent('Nichts gefunden für „senf“');
      expect(screen.queryByTestId('shopping-search-add')).not.toBeInTheDocument();
    });

    it('keeps the term and reports the error when adding fails', async () => {
      const user = userEvent.setup();
      addItem.mockImplementation((_vars: unknown, options: { onError: (err: Error) => void }) =>
        options.onError(new Error('boom')),
      );
      renderPage();
      const input = screen.getByTestId('shopping-search-input');

      await user.type(input, 'senf');
      await user.click(screen.getByTestId('shopping-search-add'));

      expect(notifyError).toHaveBeenCalledWith('Eintrag konnte nicht hinzugefügt werden', expect.anything());
      expect(input).toHaveValue('senf');
      expect(screen.getByTestId('shopping-search-empty')).toBeInTheDocument();
    });

    it('keeps the progress counting the whole list while filtering', async () => {
      const user = userEvent.setup();
      listQuery = { data: searchList(), isLoading: false, error: null };
      renderPage();
      expect(screen.getByText('1 / 3 erledigt')).toBeInTheDocument();

      await user.type(screen.getByTestId('shopping-search-input'), 'brot');

      expect(screen.getByText('1 / 3 erledigt')).toBeInTheDocument();
    });
  });

  describe('session check', () => {
    it('does not show the login hint when the session check was overloaded, and offers a retry', async () => {
      const user = userEvent.setup();
      currentUser = null;
      sessionError = new ApiError(429, 'Too Many Requests', { detail: 'Zu viele Anfragen' });
      listQuery = { data: detail(), isLoading: false, error: null };
      renderPage();

      expect(screen.queryByText('Melde dich an, um diese Einkaufsliste zu sehen.')).not.toBeInTheDocument();
      expect(screen.getByText('Anmeldung gerade nicht prüfbar')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
      expect(refetchSession).toHaveBeenCalled();
    });

    it('still asks anonymous visitors to log in when the session answers without a user', () => {
      currentUser = null;
      listQuery = { data: detail(), isLoading: false, error: null };
      renderPage();

      expect(screen.getByText('Melde dich an, um diese Einkaufsliste zu sehen.')).toBeInTheDocument();
    });

    it('keeps guests on the list when the session check fails', () => {
      currentUser = null;
      sessionError = new ApiError(503, 'Service Unavailable', {});
      saveGuestCredentials(3, { guestToken: 'guest-secret', name: 'Anna', shareToken: 'share' });
      listQuery = { data: detail(), isLoading: false, error: null };
      renderPage();

      expect(screen.queryByText('Anmeldung gerade nicht prüfbar')).not.toBeInTheDocument();
      expect(screen.getByText('Klebeband')).toBeInTheDocument();
      window.localStorage.clear();
    });
  });

  describe('export', () => {
    const openList = (overrides: Record<string, unknown> = {}) =>
      ShoppingListDetailSchema.parse({
        ...detail(),
        ...overrides,
        items: [
          { id: 1, name: 'Möhren', quantity_g: 400, unit: 'g', retail_section_name: 'Obst und Gemüse', is_checked: false, sort_order: 1, can_delete: true },
          { id: 2, name: 'Milch', quantity_g: 0, unit: 'g', retail_section_name: 'Kühlregal', is_checked: true, sort_order: 2, can_delete: true },
        ],
      });

    beforeEach(() => {
      window.localStorage.clear();
    });

    it('offers the export to owners', () => {
      listQuery = { data: openList(), isLoading: false, error: null };
      renderPage();

      expect(screen.getByRole('button', { name: 'Liste exportieren' })).toBeEnabled();
    });

    it('offers the export to viewers, who cannot change the list', () => {
      currentUser = { id: 9, display_name: 'Ben' };
      listQuery = { data: openList({ can_edit: false, is_owner: false }), isLoading: false, error: null };
      renderPage();

      expect(screen.getByRole('button', { name: 'Liste exportieren' })).toBeEnabled();
    });

    it('offers the export to guests with an invitation link', () => {
      currentUser = null;
      saveGuestCredentials(3, { guestToken: 'guest-secret', name: 'Anna', shareToken: 'share' });
      listQuery = {
        data: openList({ is_owner: false, viewer_guest_id: 7, viewer_display_name: 'Anna' }),
        isLoading: false,
        error: null,
      };
      renderPage();

      expect(screen.getByRole('button', { name: 'Liste exportieren' })).toBeEnabled();
    });

    it('hides the export in shopping mode', async () => {
      const user = userEvent.setup();
      listQuery = { data: openList(), isLoading: false, error: null };
      renderPage();
      expect(screen.getByRole('button', { name: 'Liste exportieren' })).toBeInTheDocument();

      await user.click(screen.getByTestId('shopping-shop-mode-toggle'));

      expect(screen.queryByRole('button', { name: 'Liste exportieren' })).not.toBeInTheDocument();
    });

    it('is disabled when every entry is checked', () => {
      listQuery = {
        data: ShoppingListDetailSchema.parse({
          ...detail(),
          items: [{ id: 1, name: 'Milch', quantity_g: 0, unit: 'g', retail_section_name: 'Kühlregal', is_checked: true, sort_order: 1, can_delete: true }],
        }),
        isLoading: false,
        error: null,
      };
      renderPage();

      expect(screen.getByRole('button', { name: 'Liste exportieren' })).toBeDisabled();
    });

    it('prints the open entries from a sheet that exists only while printing', async () => {
      const user = userEvent.setup();
      listQuery = { data: openList(), isLoading: false, error: null };
      let sheetWhilePrinting: string | null = null;
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {
        sheetWhilePrinting = screen.queryByTestId('shopping-print-view')?.textContent ?? null;
      });
      renderPage();
      expect(screen.queryByTestId('shopping-print-view')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Liste exportieren' }));
      await user.click(screen.getByRole('menuitem', { name: 'Drucken oder als PDF speichern' }));

      expect(printSpy).toHaveBeenCalledTimes(1);
      expect(sheetWhilePrinting).toContain('Möhren');
      expect(sheetWhilePrinting).not.toContain('Milch');
      expect(screen.queryByTestId('shopping-print-view')).not.toBeInTheDocument();
      printSpy.mockRestore();
    });
  });
});
