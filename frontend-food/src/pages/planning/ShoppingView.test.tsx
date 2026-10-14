// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ShoppingView from './ShoppingView';

const createFromMealPlan = vi.fn();
let existingLists: Array<{ id: number; name: string; source_status: 'current' | 'changed' | 'deleted' | null }> = [];

vi.mock('@/api/auth', () => ({ useCurrentUser: () => ({ data: { id: 5 } }) }));
vi.mock('@/api/mealPlans', () => ({
  useShoppingList: () => ({
    data: [
      {
        ingredient_name: 'Mehl',
        total_quantity_g: 500,
        net_quantity_g: 450,
        reserve_quantity_g: 50,
        retail_section: 'Backwaren',
        sources: [],
        portion_options: [],
        package_options: [],
        estimated_price_eur: 1.2,
      },
    ],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useIngredientScan: () => ({ data: { violations: [] } }),
}));
vi.mock('@/api/shoppingLists', () => ({
  useCreateFromMealPlan: () => ({ mutate: createFromMealPlan, isPending: false }),
  useShoppingLists: () => ({ data: { items: existingLists } }),
}));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

function renderView() {
  return render(
    <MemoryRouter>
      <ShoppingView mealPlanId={41} />
    </MemoryRouter>,
  );
}

describe('ShoppingView creating a list', () => {
  beforeEach(() => {
    createFromMealPlan.mockReset();
    existingLists = [];
  });

  it('creates directly when no current list exists', async () => {
    existingLists = [{ id: 1, name: 'Alte Liste', source_status: 'changed' }];
    const user = userEvent.setup();
    renderView();

    expect(screen.getByTestId('plan-existing-lists')).toHaveTextContent('Plan geändert');
    await user.click(screen.getByRole('button', { name: 'Einkaufsliste erstellen' }));

    expect(createFromMealPlan).toHaveBeenCalledTimes(1);
  });

  it('asks before creating another list while a current one exists', async () => {
    existingLists = [{ id: 1, name: 'Aktuelle Liste', source_status: 'current' }];
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: 'Einkaufsliste erstellen' }));

    expect(screen.getByText('Für diesen Plan gibt es bereits eine aktuelle Einkaufsliste. Trotzdem eine neue erstellen?')).toBeInTheDocument();
    expect(createFromMealPlan).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Neue Liste erstellen' }));
    expect(createFromMealPlan).toHaveBeenCalledTimes(1);
  });

  it('creates nothing when the question is cancelled', async () => {
    existingLists = [{ id: 1, name: 'Aktuelle Liste', source_status: 'current' }];
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: 'Einkaufsliste erstellen' }));
    await user.click(screen.getByRole('button', { name: 'Abbrechen' }));

    expect(createFromMealPlan).not.toHaveBeenCalled();
  });
});
