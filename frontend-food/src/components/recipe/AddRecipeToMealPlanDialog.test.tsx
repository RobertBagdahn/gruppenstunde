// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AddRecipeToMealPlanDialog from './AddRecipeToMealPlanDialog';

const mocks = vi.hoisted(() => ({
  plans: [] as unknown[],
  detail: undefined as unknown,
  addItem: vi.fn(),
  removeItem: vi.fn(),
  success: vi.fn(),
  failed: vi.fn(),
}));

vi.mock('@/api/mealPlans', () => ({
  useMealPlans: () => ({ data: mocks.plans, isLoading: false }),
  useMealPlan: () => ({ data: mocks.detail, isLoading: false }),
  useAddMealItem: () => ({ mutateAsync: mocks.addItem }),
  useRemoveMealItem: () => ({ mutateAsync: mocks.removeItem }),
}));
vi.mock('@/components/planning/CreateMealPlanDialog', () => ({
  CreateMealPlanDialog: ({ open }: { open: boolean }) => (open ? <div>Plan anlegen Dialog</div> : null),
}));
vi.mock('@/lib/notify', () => ({
  UNDO_DURATION_MS: 6000,
  notify: { success: mocks.success, failed: mocks.failed },
}));

const plan = (overrides: Record<string, unknown> = {}) => ({ id: 7, name: 'Sommerlager', norm_portions: 30, can_edit: true, is_template: false, ...overrides });
const meal = (id: number, meal_type: string, items: unknown[] = []) => ({
  id,
  meal_type,
  display_name: meal_type,
  start_datetime: '2026-07-10T12:00:00',
  items,
});

function renderDialog() {
  return render(
    <MemoryRouter>
      <AddRecipeToMealPlanDialog open onOpenChange={() => {}} recipeId={55} recipeTitle="Käse-Lauch-Suppe" />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  mocks.addItem.mockReset();
  mocks.removeItem.mockReset();
  mocks.success.mockReset();
  mocks.failed.mockReset();
  mocks.plans = [plan()];
  mocks.detail = { meals: [meal(1, 'lunch'), meal(2, 'dinner'), meal(3, 'breakfast', [{ recipe_id: 55 }])] };
});

describe('AddRecipeToMealPlanDialog', () => {
  it('lists only editable plans and offers to create one when there is none', () => {
    mocks.plans = [plan({ id: 8, name: 'Nur lesen', can_edit: false })];
    renderDialog();

    expect(screen.queryByText('Nur lesen')).toBeNull();
    expect(screen.getByRole('button', { name: /Neuen Plan anlegen/ })).toBeDefined();
  });

  it('preselects the only plan, prefills the norm portions and disables meals that already contain the recipe', () => {
    renderDialog();

    expect((screen.getByLabelText('Portionen') as HTMLInputElement).value).toBe('30');
    expect(screen.getByRole('checkbox', { name: /Frühstück/ })).toHaveProperty('disabled', true);
    expect(screen.getByText('Bereits enthalten')).toBeDefined();
  });

  it('adds the recipe to several meals and offers undo', async () => {
    mocks.addItem.mockResolvedValueOnce({ id: 101 }).mockResolvedValueOnce({ id: 102 });
    renderDialog();

    fireEvent.click(screen.getByRole('checkbox', { name: /Mittagessen/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Abendessen/ }));
    fireEvent.click(screen.getByRole('button', { name: /In 2 Mahlzeiten legen/ }));

    await waitFor(() => expect(mocks.addItem).toHaveBeenCalledTimes(2));
    expect(mocks.addItem).toHaveBeenCalledWith({ mealId: 1, recipe_id: 55 });
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());

    const options = mocks.success.mock.calls[0][1] as { cancel: { label: string; onClick: () => void }; action: { label: string } };
    expect(options.action.label).toBe('Zum Plan');
    expect(options.cancel.label).toBe('Rückgängig');
    mocks.removeItem.mockResolvedValue(undefined);
    options.cancel.onClick();
    await waitFor(() => expect(mocks.removeItem).toHaveBeenCalledTimes(2));
    expect(mocks.removeItem).toHaveBeenCalledWith(101);
    expect(mocks.removeItem).toHaveBeenCalledWith(102);
  });

  it('scales with a factor when the servings differ from the norm portions', async () => {
    mocks.addItem.mockResolvedValue({ id: 101 });
    renderDialog();

    fireEvent.change(screen.getByLabelText('Portionen'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Mittagessen/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    await waitFor(() => expect(mocks.addItem).toHaveBeenCalledWith({ mealId: 1, recipe_id: 55, factor: 0.5 }));
  });
});
