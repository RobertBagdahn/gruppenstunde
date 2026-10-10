// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { BreakfastCatalog } from '@/schemas/breakfast';
import type { MealItem } from '@/schemas/mealPlan';
import BreakfastWizardPage from './BreakfastWizardPage';

const mocks = vi.hoisted(() => ({
  useMealPlan: vi.fn(),
  useRefMeals: vi.fn(),
  useBreakfastCatalog: vi.fn(),
  useSaveBreakfastWizard: vi.fn(),
  useSaveDirectMeal: vi.fn(),
  useSaveBreakfastBulk: vi.fn(),
}));

vi.mock('@/api/mealPlans', () => ({ useMealPlan: mocks.useMealPlan }));
vi.mock('@/api/refMeals', () => ({ useRefMeals: mocks.useRefMeals }));
vi.mock('@/api/breakfast', () => ({
  useBreakfastCatalog: mocks.useBreakfastCatalog,
  useSaveBreakfastWizard: mocks.useSaveBreakfastWizard,
  useSaveDirectMeal: mocks.useSaveDirectMeal,
  useSaveBreakfastBulk: mocks.useSaveBreakfastBulk,
}));
vi.mock('sonner', () => ({ toast: { warning: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/buffet/BuffetBuilder', () => ({
  BuffetBuilder: ({ open }: { open: boolean }) => (open ? <div data-testid="free-buffet-dialog" /> : null),
}));
vi.mock('./StepBasis', () => ({
  default: ({ wiz }: { wiz: { state: { basis: Array<{ name: string; sharePercent: number }>; fatSelections: Array<{ name: string }> } } }) => (
    <>
      <output data-testid="breakfast-basis-state">
        {wiz.state.basis.map(({ name, sharePercent }) => `${name}:${sharePercent}`).join('|')}
      </output>
      <output data-testid="breakfast-fat-state">
        {wiz.state.fatSelections.map(({ name }) => name).join('|')}
      </output>
    </>
  ),
}));

const catalog: BreakfastCatalog = {
  base_ingredients: [
    { id: 1, name: 'Baguette', slug: 'baguette', is_standalone_food: true, standard_recipe_weight_g: 50, energy_kcal: 250, price_per_kg: 3, portions: [] },
    { id: 2, name: 'Haferflocken', slug: 'haferflocken', is_standalone_food: true, standard_recipe_weight_g: null, energy_kcal: 370, price_per_kg: 2, portions: [] },
    { id: 3, name: 'Cornflakes', slug: 'cornflakes', is_standalone_food: true, standard_recipe_weight_g: null, energy_kcal: 370, price_per_kg: 3, portions: [] },
  ],
  topping_ingredients: [
    { id: 4, name: 'Gouda', slug: 'gouda', is_standalone_food: true, energy_kcal: 350, price_per_kg: 8, portions: [] },
  ],
  fat_ingredients: [
    { id: 5, name: 'Deutsche Markenbutter', slug: 'butter', is_standalone_food: true, energy_kcal: 717, price_per_kg: 9, portions: [] },
  ],
  extra_ingredients: [
    { id: 6, name: 'Apfel', slug: 'apfel', is_standalone_food: true, energy_kcal: 52, price_per_kg: 3, portions: [] },
  ],
  drink_ingredients: [
    { id: 7, name: 'Milch', slug: 'milch', is_standalone_food: true, energy_kcal: 64, price_per_kg: 1.5, portions: [] },
  ],
  drink_recipes: [],
  warm_meal_recipes: [],
  gram_measuring_unit_id: 10,
  ml_measuring_unit_id: 11,
  scheibe_measuring_unit_id: null,
  portion_measuring_unit_id: null,
  tasse_measuring_unit_id: null,
  schuss_measuring_unit_id: null,
};

function makeMealItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: 1,
    recipe_id: null,
    recipe_title: '',
    recipe_slug: '',
    image_url: null,
    ingredient_id: 1,
    ingredient_name: 'Baguette',
    ingredient_slug: 'baguette',
    quantity: 60,
    measuring_unit_id: 10,
    measuring_unit_name: 'Gramm',
    display_name: null,
    factor: 1,
    active_recipe_item_ids: [],
    variant_group_id: null,
    energy_kcal: 150,
    cost_eur: null,
    quantity_g: 60,
    ingredient_tags: [],
    recipe_type: '',
    nutri_class: null,
    overrides: [],
    has_missing_weight: false,
    is_per_norm_person: true,
    recipe_portions: null,
    buffet_role: '',
    is_breakfast_assistant: false,
    warnings: [],
    ...overrides,
  };
}

const mealPlan = {
  id: 1,
  name: 'Sommerlager',
  norm_portions: 10,
  meals: [
    {
      id: 2,
      meal_type: 'breakfast',
      day_part_factor: 0.25,
      is_reference: false,
      breakfast_profile: '',
      start_datetime: null,
      items: [],
    },
  ],
};

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/meal-plans/1/meals/2/breakfast-wizard']}>
      <Routes>
        <Route path="/meal-plans/:id/meals/:mealId/breakfast-wizard" element={<BreakfastWizardPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useMealPlan.mockReturnValue({ data: mealPlan });
  mocks.useRefMeals.mockReturnValue({ data: [] });
  mocks.useBreakfastCatalog.mockReturnValue({ data: catalog, isLoading: false, isError: false, refetch: vi.fn() });
  mocks.useSaveBreakfastWizard.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  mocks.useSaveDirectMeal.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  mocks.useSaveBreakfastBulk.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
});

describe('BreakfastWizardPage profiles', () => {
  it('shows the five named profiles and keeps free as a separate option', () => {
    renderWizard();

    for (const title of ['Nur Müsli', 'Brot und Müsli', 'Brot pflanzlich', 'Brot vegetarisch', 'Brot mit Fleisch']) {
      expect(screen.getByRole('button', { name: new RegExp(title) })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: /Freies Buffet/ })).toBeInTheDocument();
  });

  it('blocks continuing when the required base catalog is empty', () => {
    mocks.useBreakfastCatalog.mockReturnValue({
      data: { ...catalog, base_ingredients: [] },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Nur Müsli/ }));
    expect(screen.getByRole('button', { name: /Basis-Zutat erstellen/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Weiter/ })).toBeDisabled();
  });

  it('starts the muesli profile with cereal, fruit, and no spread selection', () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Nur Müsli/ }));

    expect(screen.getByTestId('breakfast-basis-state')).toHaveTextContent('Haferflocken:100|Cornflakes:0');
    expect(screen.getByTestId('breakfast-fat-state')).toBeEmptyDOMElement();
  });

  it('starts Brot und Müsli with a bread/cereal distribution', () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Brot und Müsli/ }));

    expect(screen.getByTestId('breakfast-basis-state')).toHaveTextContent('Baguette:60|Haferflocken:40');
  });

  it('does not treat a manually added buffet-tagged item as assistant-owned when provenance exists', () => {
    const manualTaggedItem = makeMealItem({
      id: 10,
      ingredient_id: 6,
      ingredient_name: 'Apfel',
      ingredient_slug: 'apfel',
      quantity: 40,
      quantity_g: 40,
      ingredient_tags: ['buffet-fresh'],
    });
    const assistantItem = makeMealItem({
      id: 11,
      is_breakfast_assistant: true,
      ingredient_tags: ['buffet-bread'],
    });
    mocks.useMealPlan.mockReturnValue({
      data: {
        ...mealPlan,
        meals: [{ ...mealPlan.meals[0], items: [manualTaggedItem, assistantItem] }],
      },
    });

    renderWizard();

    expect(screen.getByTestId('breakfast-basis-state')).toHaveTextContent('Baguette:100');
    expect(screen.getByTestId('breakfast-basis-state')).not.toHaveTextContent('Apfel');
  });

  it('opens the generic builder from the separate free-buffet option', () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Freies Buffet/ }));
    expect(screen.getByTestId('free-buffet-dialog')).toBeInTheDocument();
  });
});
