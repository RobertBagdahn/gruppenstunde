// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Meal } from '@/schemas/mealPlan';
import { TripPlanSchema, type TripPlan } from '@/schemas/shoppingTrip';
import { DayPlanView } from './DayPlanView';

const { createMutate, updateMutate, state } = vi.hoisted(() => ({
  createMutate: vi.fn(),
  updateMutate: vi.fn(),
  state: { plan: null as unknown },
}));

vi.mock('@/api/mealPlans', () => ({ useReorderMeals: () => ({ mutate: vi.fn() }) }));
vi.mock('@/api/shoppingTrips', () => ({
  useTripPlan: () => ({ data: state.plan }),
  useCreateTrip: () => ({ mutate: createMutate, isPending: false, error: null }),
  useUpdateTrip: () => ({ mutate: updateMutate, isPending: false, error: null }),
}));
vi.mock('@/api/shoppingStores', () => ({
  useStores: () => ({ isPending: false, data: { items: [{ id: 2, name: 'Rewe', created_at: '' }], total: 1, page: 1, page_size: 8, total_pages: 1 } }),
  useCreateStore: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock('./MealSlot', () => ({ MealSlot: ({ meal }: { meal: Meal }) => <div data-testid="meal">{meal.meal_type}</div> }));
vi.mock('@/components/planning/RefMealChips', () => ({ RefMealChips: () => null }));
vi.mock('./RecipeSearchDialog', () => ({ default: () => null }));
vi.mock('@/components/planning/LinkEventDialog', () => ({ default: ({ open }: { open: boolean }) => (open ? <div role="dialog">Event verknüpfen</div> : null) }));

const at = (hour: number) => new Date(2026, 9, 24, hour, 0).toISOString();
const meal = (id: number, type: string, hour: number) =>
  ({ id, meal_type: type, start_datetime: at(hour), end_datetime: at(hour + 1), total_energy_kcal: 0, total_cost_eur: 0, day_part_factor: 0.3, items: [], is_synced: false, override_portions: null }) as unknown as Meal;

function makePlan(canManage = true): TripPlan {
  return TripPlanSchema.parse({
    event_id: 1, event_slug: 'sommerlager', event_name: 'Sommerlager', can_manage: canManage,
    trips: [{ list_id: 9, name: 'Rewe · Sa 24.10. 10:00', store_id: 2, store_name: 'Rewe', scheduled_at: at(10), status: 'planned' }],
  });
}

function renderView(tripPlanning: { eventSlug: string; plan: { name: string; start_datetime: null; end_datetime: null } } | undefined, canEdit = true) {
  return render(
    <MemoryRouter>
      <DayPlanView
        mealPlanId={4}
        dayGroups={[{ date: '2026-10-24', meals: [meal(1, 'breakfast', 8), meal(2, 'lunch', 12)] }]}
        canEdit={canEdit}
        hasTimeframe={false}
        normPortions={10}
        onAddDayBefore={vi.fn()}
        addDayBeforePending={false}
        onAddDayAfter={vi.fn()}
        addDayAfterPending={false}
        onDeleteDay={vi.fn()}
        onAddMealType={vi.fn()}
        onDeleteMeal={vi.fn()}
        onAddRecipe={vi.fn()}
        onAddIngredient={vi.fn()}
        onDeleteItem={vi.fn()}
        onUpdateItemFactor={vi.fn()}
        onUpdateMeal={vi.fn()}
        onScaleMeal={vi.fn()}
        onCopyFromPlan={vi.fn()}
        tripPlanning={tripPlanning}
      />
    </MemoryRouter>,
  );
}

const planning = { eventSlug: 'sommerlager', plan: { name: 'Plan', start_datetime: null, end_datetime: null } };

describe('DayPlanView shopping trips', () => {
  beforeEach(() => {
    createMutate.mockReset();
    updateMutate.mockReset();
    state.plan = makePlan();
  });

  it('sorts the trip between breakfast and lunch', () => {
    renderView(planning);

    const order = screen
      .getAllByText(/breakfast|lunch|Einkauf Rewe/)
      .map((element) => element.textContent);
    expect(order[0]).toBe('breakfast');
    expect(order[1]).toMatch(/Einkauf Rewe · 10:00/);
    expect(order[2]).toBe('lunch');
    expect(screen.getByRole('link', { name: /Einkauf Rewe · 10:00/ })).toHaveAttribute('href', '/shopping-lists/events/sommerlager?trip=9');
  });

  it('inserts a trip for the day with the day pre-filled', async () => {
    const user = userEvent.setup();
    renderView(planning);

    await user.click(screen.getByRole('button', { name: 'Einkauf einfügen' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Datum')).toHaveValue('2026-10-24');
    await user.click(within(dialog).getByRole('combobox'));
    await user.click(await within(dialog).findByRole('button', { name: /Rewe/ }));
    await user.type(within(dialog).getByLabelText('Uhrzeit'), '11:00');
    await user.click(within(dialog).getByRole('button', { name: 'Hinzufügen' }));

    expect(createMutate).toHaveBeenCalledWith({ store_id: 2, scheduled_at: '2026-10-24T11:00', name: undefined }, expect.anything());
  });

  it('changes the time of a planned trip', async () => {
    const user = userEvent.setup();
    renderView(planning);

    await user.click(screen.getByRole('button', { name: 'Uhrzeit ändern' }));
    const dialog = await screen.findByRole('dialog');
    const time = within(dialog).getByLabelText('Uhrzeit');
    await user.clear(time);
    await user.type(time, '07:30');
    await user.click(within(dialog).getByRole('button', { name: 'Speichern' }));

    expect(updateMutate).toHaveBeenCalledWith(expect.objectContaining({ listId: 9, store_id: 2 }), expect.anything());
  });

  it('only reads for people without planning rights', () => {
    state.plan = makePlan(false);
    renderView(planning);

    expect(screen.getByTestId('day-trip-marker')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Einkauf einfügen' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Uhrzeit ändern' })).not.toBeInTheDocument();
  });

  it('asks to link an event when the plan has none', async () => {
    const user = userEvent.setup();
    state.plan = undefined;
    renderView({ ...planning, eventSlug: '' });

    expect(screen.getByText('Event verknüpfen, um Einkäufe zu planen')).toBeInTheDocument();
    expect(screen.queryByTestId('day-trip-marker')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Event verknüpfen' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Event verknüpfen');
  });
});
