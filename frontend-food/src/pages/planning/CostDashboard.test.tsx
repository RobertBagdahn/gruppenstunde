import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CostDashboard from './CostDashboard';
import { useMealPlanCosts, useIngredientScan } from '@/api/mealPlans';

vi.mock('@/api/mealPlans', () => ({
  useMealPlanCosts: vi.fn(),
  useIngredientScan: vi.fn(),
}));

const mockedUseMealPlanCosts = vi.mocked(useMealPlanCosts);
const mockedUseIngredientScan = vi.mocked(useIngredientScan);

function renderDashboard() {
  return render(
    <MemoryRouter>
      <CostDashboard mealPlanId={1} budgetPerPersonPerDay={3} />
    </MemoryRouter>
  );
}

describe('CostDashboard price coverage', () => {
  it('shows the partial-cost warning when prices are missing', () => {
    mockedUseMealPlanCosts.mockReturnValue({
      data: {
        total_cost: 12.5,
        total_cost_with_reserve: 13.75,
        reserve_factor: 1.1,
        cost_per_person: 1.25,
        norm_portions: 10,
        total_ingredients: 4,
        priced_ingredients: 2,
        missing_ingredients: 2,
        coverage: 0.5,
        days: [],
        recipes: [],
      },
      isLoading: false,
      error: null,
    } as never);
    mockedUseIngredientScan.mockReturnValue({ data: null } as never);

    renderDashboard();

    expect(screen.getByText(/Geschätzte Kosten/)).toBeInTheDocument();
    expect(screen.getByText(/2 von 4 Zutaten haben einen Preis \(50% Abdeckung\)/)).toBeInTheDocument();
    expect(screen.getByText(/2 Zutaten haben noch keinen bestätigten Preis/)).toBeInTheDocument();
  });

  it('shows no warning when coverage is complete', () => {
    mockedUseMealPlanCosts.mockReturnValue({
      data: {
        total_cost: 20,
        total_cost_with_reserve: 22,
        reserve_factor: 1.1,
        cost_per_person: 2,
        norm_portions: 10,
        total_ingredients: 3,
        priced_ingredients: 3,
        missing_ingredients: 0,
        coverage: 1,
        days: [],
        recipes: [],
      },
      isLoading: false,
      error: null,
    } as never);
    mockedUseIngredientScan.mockReturnValue({ data: null } as never);

    renderDashboard();

    expect(screen.queryByText(/Geschätzte Kosten/)).not.toBeInTheDocument();
  });
});
