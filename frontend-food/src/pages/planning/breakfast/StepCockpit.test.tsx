// @vitest-environment jsdom
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BreakfastCatalog, BreakfastProfileSlug, WizardState } from '@/schemas/breakfast';
import { defaultWizardState } from '@/schemas/breakfast';
import { buildBreakfastProfileState } from '@/lib/breakfastProfiles';
import { useWizardState } from './useWizardState';
import StepCockpit from './StepCockpit';

vi.mock('@/api/mealPlans', () => ({
  useScaleMealToTarget: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const DAY_PART_FACTOR = 0.25;

function ingredient(id: number, name: string, energyKcal: number | null) {
  return { id, name, slug: name.toLowerCase(), is_standalone_food: true, energy_kcal: energyKcal, price_per_kg: null, portions: [] };
}

const catalog: BreakfastCatalog = {
  base_ingredients: [
    { ...ingredient(2, 'Vollkornbrot', 220), standard_recipe_weight_g: 50 },
    { ...ingredient(4, 'Haferflocken', 370), standard_recipe_weight_g: null },
  ],
  topping_ingredients: [
    ingredient(11, 'Gouda', 350),
    ingredient(12, 'Honig', 304),
  ],
  fat_ingredients: [ingredient(20, 'Butter', 717)],
  extra_ingredients: [ingredient(30, 'Apfel', 52), ingredient(31, 'Banane', 89)],
  drink_ingredients: [ingredient(40, 'Milch', 64)],
  drink_recipes: [{ id: 50, title: 'Kakao', recipe_type: 'drink', cached_energy_total_kcal: 120, cached_weight_g: 250 }],
  warm_meal_recipes: [],
  gram_measuring_unit_id: 100,
  ml_measuring_unit_id: 101,
  scheibe_measuring_unit_id: null,
  portion_measuring_unit_id: null,
  tasse_measuring_unit_id: null,
  schuss_measuring_unit_id: null,
};

function CockpitHarness({ initialState }: { initialState: WizardState }) {
  // Stable initial state: useWizardState re-applies it whenever the object identity changes.
  const [stableState] = useState(initialState);
  const wiz = useWizardState(stableState, 'cockpit');
  return (
    <StepCockpit
      wiz={wiz}
      catalog={catalog}
      dayPartFactor={DAY_PART_FACTOR}
      saveMode="refMeal"
      planId={1}
      mealId={null}
      breakfastMeals={[]}
      selectedBreakfastMealIds={[]}
      onSelectedBreakfastMealIdsChange={() => undefined}
      manualItemCount={0}
      manualItemsPolicy="preserve"
      onManualItemsPolicyChange={() => undefined}
    />
  );
}

function kcalOf(text: string | null): number {
  const match = /(\d+) kcal/.exec(text ?? '');
  return match ? Number(match[1]) : 0;
}

function renderProfile(profile: BreakfastProfileSlug) {
  const { state } = buildBreakfastProfileState(profile, catalog, defaultWizardState());
  const view = render(<CockpitHarness initialState={state} />);
  const ist = kcalOf(screen.getByTestId('cockpit-ist-kcal').textContent);
  const itemKcal = screen.getAllByTestId('cockpit-item-kcal').map((cell) => kcalOf(cell.textContent));
  const foodTotal = kcalOf(screen.getByTestId('cockpit-food-total-kcal').textContent);
  view.unmount();
  return { ist, itemKcal, foodTotal };
}

describe('StepCockpit energy check', () => {
  it('shows different Ist values for Nur Müsli and Brot vegetarisch', () => {
    const muesli = renderProfile('muesli');
    const bread = renderProfile('vegetarian');

    expect(muesli.ist).toBeGreaterThan(0);
    expect(bread.ist).toBeGreaterThan(0);
    expect(muesli.ist).not.toBe(bread.ist);
  });

  it.each<BreakfastProfileSlug>(['muesli', 'vegetarian'])('sums the item rows of profile %s to the total', (profile) => {
    const { itemKcal, foodTotal } = renderProfile(profile);
    const rowSum = itemKcal.reduce((sum, kcal) => sum + kcal, 0);

    expect(foodTotal).toBeGreaterThan(0);
    // Each row is rounded on its own, so allow one kcal per row.
    expect(Math.abs(rowSum - foodTotal)).toBeLessThanOrEqual(itemKcal.length);
  });

  it('shows the real kcal of extras instead of a loading text', () => {
    const { state } = buildBreakfastProfileState('muesli', catalog, defaultWizardState());
    render(<CockpitHarness initialState={state} />);

    expect(screen.queryByText('kcal wird geladen…')).toBeNull();
    // Apfel: 80 g × 52 kcal/100 g ≈ 42 kcal
    expect(screen.getAllByTestId('cockpit-item-kcal').map((cell) => cell.textContent)).toContain('42 kcal');
  });
});
