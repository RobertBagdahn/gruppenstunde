import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RefMealChips } from './RefMealChips';
import type { RefMeal } from '@/schemas/mealPlan';

const breakfastRef: RefMeal = {
  id: 3,
  meal_type: 'breakfast',
  day_part_factor: 0.25,
  items: [],
  synced_meals_count: 2,
  total_meals_count: 3,
  can_edit: true,
  can_delete: true,
};

function renderChips(refMeals: RefMeal[], canEdit: boolean) {
  return render(
    <MemoryRouter>
      <RefMealChips mealPlanId={14} refMeals={refMeals} canEdit={canEdit} />
    </MemoryRouter>,
  );
}

describe('RefMealChips', () => {
  it('shows existing reference meals from ref_meals as links for editors', () => {
    renderChips([breakfastRef], true);
    const link = screen.getByRole('link', { name: /Referenz: Frühstück/ });
    expect(link).toHaveAttribute('href', '/meal-plans/14/ref-meals/breakfast');
    expect(screen.getByText(/0 Einträge · 2\/3 verknüpft/)).toBeInTheDocument();
  });

  it('offers to create missing reference meals for editors', () => {
    renderChips([breakfastRef], true);
    expect(screen.getByRole('link', { name: /Referenz: Snack/ })).toHaveAttribute(
      'href',
      '/meal-plans/14/ref-meals/snack',
    );
  });

  it('shows reference meals without links for viewers', () => {
    renderChips([breakfastRef], false);
    expect(screen.getByText('Referenz: Frühstück')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders nothing for viewers without reference meals', () => {
    const { container } = renderChips([], false);
    expect(container).toBeEmptyDOMElement();
  });
});
