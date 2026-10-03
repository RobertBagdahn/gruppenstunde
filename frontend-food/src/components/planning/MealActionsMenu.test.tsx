import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealActionsMenu } from './MealActionsMenu';
import type { Meal } from '@/schemas/mealPlan';

vi.mock('@/api/mealPlans', () => ({
  useReorderMeals: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe('MealActionsMenu', () => {
  const baseMeal: Meal = {
    id: 101,
    meal_type: 'breakfast',
    start_datetime: '2026-08-10T08:00:00',
    end_datetime: '2026-08-10T09:00:00',
    day_part_factor: 0.25,
    display_name: 'Frühstück',
    override_portions: null,
    is_external: false,
    external_cost_per_person: null,
    external_energy_kcal: null,
    is_reference: false,
    ref_meal_id: null,
    is_synced: false,
    note: '',
    note_is_published: false,
    total_energy_kcal: 500,
    total_cost_eur: 15,
    price_coverage: null,
    items: [],
  };

  it('opens the buffet builder when Buffetassistent is clicked', async () => {
    const onOpenBuffetBuilder = vi.fn();
    render(
      <MealActionsMenu
        meal={baseMeal}
        canEdit={true}
        planId={42}
        onDeleteMeal={vi.fn()}
        onUpdateMeal={vi.fn()}
        onScaleMeal={vi.fn()}
        onOpenBuffetBuilder={onOpenBuffetBuilder}
      />
    );

    // Open dropdown menu
    const trigger = screen.getByRole('button');
    fireEvent.pointerDown(trigger);

    // Find and click Buffetassistent
    const wizardItem = await screen.findByText('Buffetassistent');
    expect(wizardItem).toBeInTheDocument();
    fireEvent.click(wizardItem);

    expect(onOpenBuffetBuilder).toHaveBeenCalledTimes(1);
  });

  it('shows Buffetassistent for lunch meals too', async () => {
    const onOpenBuffetBuilder = vi.fn();
    const lunchMeal: Meal = { ...baseMeal, id: 102, meal_type: 'lunch' };
    render(
      <MealActionsMenu
        meal={lunchMeal}
        canEdit={true}
        planId={42}
        onDeleteMeal={vi.fn()}
        onUpdateMeal={vi.fn()}
        onScaleMeal={vi.fn()}
        onOpenBuffetBuilder={onOpenBuffetBuilder}
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.pointerDown(trigger);

    expect(await screen.findByText('Buffetassistent')).toBeInTheDocument();
  });

  it('displays Buffetassistent for drink meals', async () => {
    const drinkMeal: Meal = { ...baseMeal, id: 103, meal_type: 'drinks' };
    render(
      <MealActionsMenu
        meal={drinkMeal}
        canEdit={true}
        planId={42}
        onDeleteMeal={vi.fn()}
        onUpdateMeal={vi.fn()}
        onScaleMeal={vi.fn()}
        onOpenBuffetBuilder={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.pointerDown(trigger);

    expect(await screen.findByText('Buffetassistent')).toBeInTheDocument();
  });

  it('does not display Buffetassistent when no handler is passed', async () => {
    render(
      <MealActionsMenu
        meal={baseMeal}
        canEdit={true}
        planId={42}
        onDeleteMeal={vi.fn()}
        onUpdateMeal={vi.fn()}
        onScaleMeal={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.pointerDown(trigger);

    expect(screen.queryByText('Buffetassistent')).not.toBeInTheDocument();
  });
});
