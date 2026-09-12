import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealActionsMenu } from './MealActionsMenu';
import type { Meal } from '@/schemas/mealPlan';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

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
    items: [],
  };

  it('navigates to direct-meal breakfast wizard when Frühstücksassistent is clicked', async () => {
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

    // Open dropdown menu
    const trigger = screen.getByRole('button');
    fireEvent.pointerDown(trigger);

    // Find and click Frühstücksassistent
    const wizardItem = await screen.findByText('Frühstücksassistent');
    expect(wizardItem).toBeInTheDocument();
    fireEvent.click(wizardItem);

    expect(mockNavigate).toHaveBeenCalledWith('/meal-plans/42/meals/101/breakfast-wizard');
  });

  it('does not display Frühstücksassistent for lunch meals', async () => {
    const lunchMeal: Meal = { ...baseMeal, id: 102, meal_type: 'lunch' };
    render(
      <MealActionsMenu
        meal={lunchMeal}
        canEdit={true}
        planId={42}
        onDeleteMeal={vi.fn()}
        onUpdateMeal={vi.fn()}
        onScaleMeal={vi.fn()}
      />
    );

    const trigger = screen.getByRole('button');
    fireEvent.pointerDown(trigger);

    expect(screen.queryByText('Frühstücksassistent')).not.toBeInTheDocument();
  });
});
