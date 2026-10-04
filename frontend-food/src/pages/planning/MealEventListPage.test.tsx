// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MealPlan } from '@/schemas/mealPlan';
import MealEventListPage from './MealEventListPage';

const duplicate = vi.fn();
const remove = vi.fn();

const plans = [
  {
    id: 19,
    name: 'ZZ-TEST Plan mit einem sehr langen Namen für das Herbstlager',
    owner_id: 5,
    is_owner: true,
    visibility: 'private',
    meals_count: 7,
    norm_portions: 20,
    start_datetime: '2099-10-09T18:00:00Z',
    end_datetime: '2099-10-11T14:00:00Z',
    event_name: null,
    can_edit: true,
    can_delete: true,
  },
  {
    id: 20,
    name: 'Bundesrat 2026',
    owner_id: 5,
    is_owner: true,
    visibility: 'private',
    meals_count: 7,
    norm_portions: 40,
    start_datetime: '2099-11-09T18:00:00Z',
    end_datetime: '2099-11-11T14:00:00Z',
    event_name: null,
    can_edit: true,
    can_delete: true,
  },
] as unknown as MealPlan[];

vi.mock('@/api/mealPlans', () => ({
  useMealPlans: () => ({ data: plans, error: null, isLoading: false, refetch: vi.fn() }),
  useCreateMealPlan: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteMealPlan: () => ({ mutate: remove, isPending: false }),
  useDuplicateMealPlan: () => ({ mutate: duplicate, isPending: false }),
}));
vi.mock('@/api/auth', () => ({ useCurrentUser: () => ({ isLoading: false, data: { id: 5 } }) }));
vi.mock('@/components/planning/MealPlanFilterSidebar', () => ({ default: () => <div /> }));
vi.mock('@/components/recipe/NutritionalTagMultiSelect', () => ({ default: () => <div /> }));

function renderPage() {
  return render(
    <MemoryRouter>
      <MealEventListPage />
    </MemoryRouter>,
  );
}

describe('MealEventListPage plan cards', () => {
  beforeEach(() => {
    duplicate.mockReset();
    remove.mockReset();
    window.localStorage.clear();
  });

  it('keeps the plan name readable: up to two lines, badge outside the heading, full name as tooltip', () => {
    renderPage();

    const heading = screen.getByRole('heading', { name: /ZZ-TEST Plan mit einem sehr langen Namen/ });
    expect(heading.className).toContain('line-clamp-2');
    expect(heading.className).not.toContain('truncate');
    expect(heading.getAttribute('title')).toBe(plans[0].name);
    expect(within(heading).queryByText('Mein Plan')).toBeNull();
  });

  it('names the plan in the delete dialog', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Aktionen für Bundesrat 2026' }));
    await user.click(await screen.findByRole('menuitem', { name: /Löschen/ }));

    expect(await screen.findByText('Essensplan „Bundesrat 2026“ löschen?')).toBeTruthy();
  });

  it('prefills the copy name with a suffix but submits the typed name unchanged', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Aktionen für Bundesrat 2026' }));
    await user.click(await screen.findByRole('menuitem', { name: /Als Vorlage verwenden/ }));

    const nameInput = (await screen.findByDisplayValue('Bundesrat 2026 (Kopie)')) as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'Sommerlager 2027');
    await user.click(screen.getByRole('button', { name: 'Erstellen' }));

    expect(duplicate).toHaveBeenCalledTimes(1);
    expect(duplicate.mock.calls[0][0]).toMatchObject({ id: 20, name: 'Sommerlager 2027' });
  });
});
