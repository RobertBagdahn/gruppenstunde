// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import RecipePurchaseDialog from './RecipePurchaseDialog';

const { mutate, state } = vi.hoisted(() => ({
  mutate: vi.fn(),
  state: { error: null as unknown, lists: [] as unknown[] },
}));

vi.mock('@/api/shoppingLists', () => ({
  useCreateFromRecipe: () => ({ mutate, isPending: false, isError: state.error !== null, error: state.error }),
  useShoppingLists: () => ({ data: { items: state.lists, total: state.lists.length, page: 1, page_size: 50, total_pages: 1 } }),
}));
vi.mock('@/api/recipes', () => ({
  useRecipes: () => ({ data: { items: [{ id: 12, title: 'Stockbrot', portions: 4 }] } }),
}));
vi.mock('@/api/shoppingStores', () => ({
  useStores: () => ({ isPending: false, data: { items: [{ id: 2, name: 'Rewe', created_at: '' }], total: 1, page: 1, page_size: 8, total_pages: 1 } }),
  useCreateStore: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const recipe = { id: 7, title: 'Waffeln', hasConsumables: false };

function renderDialog(props: Partial<React.ComponentProps<typeof RecipePurchaseDialog>> = {}) {
  const onDone = vi.fn();
  render(<RecipePurchaseDialog open onOpenChange={vi.fn()} recipe={recipe} defaultPortions={12} onDone={onDone} {...props} />);
  return onDone;
}

describe('RecipePurchaseDialog', () => {
  beforeEach(() => {
    mutate.mockReset();
    state.error = null;
    state.lists = [
      { id: 31, name: 'Grillabend', can_edit: true },
      { id: 32, name: 'Nur lesen', can_edit: false },
    ];
  });

  it('starts a new trip with shop and time', async () => {
    const user = userEvent.setup();
    const onDone = renderDialog();

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('button', { name: /Rewe/ }));
    await user.type(screen.getByLabelText('Datum'), '2026-10-22');
    await user.type(screen.getByLabelText('Uhrzeit'), '16:00');
    await user.click(screen.getByRole('button', { name: 'Einkauf anlegen' }));

    expect(mutate).toHaveBeenCalledWith(
      { recipeId: 7, portions: 12, include_consumables: true, store_id: 2, scheduled_at: '2026-10-22T16:00' },
      expect.anything(),
    );
    mutate.mock.calls[0][1].onSuccess({ id: 99 });
    expect(onDone).toHaveBeenCalledWith({ id: 99 });
  });

  it('adds the recipe to an existing list the user may edit', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('radio', { name: 'Zu bestehender Liste' }));
    const select = screen.getByLabelText('Liste');
    expect(within(select).queryByRole('option', { name: 'Nur lesen' })).not.toBeInTheDocument();
    await user.selectOptions(select, '31');
    await user.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    expect(mutate).toHaveBeenCalledWith(
      { recipeId: 7, portions: 12, include_consumables: true, shopping_list_id: 31 },
      expect.anything(),
    );
  });

  it('asks for a target when nothing was chosen', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Einkauf anlegen' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Bitte wähle einen Laden und einen Zeitpunkt oder eine bestehende Liste.');
    expect(mutate).not.toHaveBeenCalled();
  });

  it('shows the conflict for created event trips', () => {
    state.error = new ApiError(409, 'Conflict', { detail: 'Rezepte kommen bei Events über den Essensplan' });
    renderDialog();

    expect(screen.getByRole('alert')).toHaveTextContent('Rezepte kommen bei Events über den Essensplan');
  });

  it('offers only a new purchase on the overview and asks for the recipe first', async () => {
    const user = userEvent.setup();
    renderDialog({ recipe: undefined, allowExisting: false });

    expect(screen.queryByRole('radio', { name: 'Zu bestehender Liste' })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Rezept'), 'Stock');
    await user.click(await screen.findByRole('button', { name: 'Stockbrot' }));

    expect(screen.getByLabelText('Portionen')).toHaveValue(4);
  });
});
