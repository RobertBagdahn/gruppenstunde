import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from './HomePage';

const state = vi.hoisted(() => ({
  user: null as null | { id: number },
  plans: [] as unknown[],
}));

vi.mock('@/api/dashboard', () => ({
  useFoodDashboard: () => ({
    isLoading: false,
    isError: false,
    data: {
      recipe_count: 248,
      ingredient_count: 1240,
      meal_plan_count: 3,
      active_meal_plan_count: 3,
      shopping_list_count: 2,
      open_shopping_list_count: 2,
      insights: { most_planned_recipe: null, avg_ingredients_per_recipe: 8.4, newest_recipe: null, total_meal_days_planned: 0 },
    },
  }),
}));
vi.mock('@/api/auth', () => ({ useCurrentUser: () => ({ data: state.user }) }));
vi.mock('@/api/mealPlans', () => ({ useMealPlans: () => ({ data: state.plans }) }));
vi.mock('@/api/recipes', () => ({ useRecipes: () => ({ data: { items: [] } }) }));

function renderHome() {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe('start page (food-homepage)', () => {
  beforeEach(() => {
    state.user = null;
    state.plans = [];
  });

  it('has one H1 and the two actions', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Was kocht ihr als Nächstes?');
    expect(screen.getByRole('link', { name: /Essensplan erstellen/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Rezepte entdecken/ })).toBeInTheDocument();
  });

  it('shows the counts inside the module tiles', () => {
    renderHome();
    expect(screen.getByText('248 Rezepte')).toBeInTheDocument();
    expect(screen.getByText('3 aktiv')).toBeInTheDocument();
    expect(screen.getByText('2 offen')).toBeInTheDocument();
  });

  it('shows the real recipe-type and plan-setting tags on the tiles', () => {
    renderHome();
    expect(screen.getByText('Warme Mahlzeit')).toBeInTheDocument();
    expect(screen.getByText('Zeltlager')).toBeInTheDocument();
  });

  it('shows no "Weiter planen" card to visitors', () => {
    renderHome();
    expect(screen.queryByText('Weiter planen')).toBeNull();
  });

  it('shows "Weiter planen" with progress for a signed-in user with a plan', () => {
    state.user = { id: 1 };
    state.plans = [
      {
        id: 7,
        name: 'Herbstlager 2026',
        start_datetime: '2099-10-26T07:00:00Z',
        end_datetime: '2099-10-30T17:00:00Z',
        norm_portions: 32,
        meals_count: 13,
        filled_meals_count: 12,
        budget_per_person_per_day: 7,
      },
    ];
    renderHome();
    expect(screen.getByText('Weiter planen')).toBeInTheDocument();
    expect(screen.getByText('Herbstlager 2026')).toBeInTheDocument();
    expect(screen.getByText(/12 von 13/)).toBeInTheDocument();
    expect(screen.getByText('92 %')).toBeInTheDocument();
    expect(screen.getByText('7,00 €')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Zum Essensplan/ })).toHaveAttribute('href', '/meal-plans/7');
  });
});
