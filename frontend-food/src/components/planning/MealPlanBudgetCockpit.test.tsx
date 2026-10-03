import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MealPlanBudgetCockpit } from './MealPlanBudgetCockpit';
import { NORM_PERSON_DAILY_KCAL, type Meal } from '@/schemas/mealPlan';

function meal(total_energy_kcal: number): Meal {
  return {
    id: 1,
    start_datetime: '2026-06-26T12:00:00',
    end_datetime: null,
    meal_type: 'lunch',
    day_part_factor: 1,
    display_name: '',
    override_portions: null,
    note: '',
    note_is_published: false,
    is_reference: false,
    ref_meal_id: null,
    is_synced: false,
    buffet_template_id: null,
    breakfast_profile: '',
    is_external: false,
    external_energy_kcal: null,
    external_cost_per_person: null,
    total_energy_kcal,
    total_cost_eur: 0,
    price_coverage: null,
    items: [],
  };
}

describe('MealPlanBudgetCockpit', () => {
  it('shows the norm-person target instead of a hard-coded value', () => {
    expect(NORM_PERSON_DAILY_KCAL).toBe(2335);
    render(<MealPlanBudgetCockpit normPortions={10} meals={[meal(19760)]} />);

    expect(screen.getByText(/Ziel: 2\.335/)).toBeInTheDocument();
    expect(screen.getByText(/\/ 2\.335 kcal/)).toBeInTheDocument();
    expect(screen.getByText(/1\.976/)).toBeInTheDocument();
    expect(screen.queryByText(/Ziel: 2\.000/)).toBeNull();
  });
});
