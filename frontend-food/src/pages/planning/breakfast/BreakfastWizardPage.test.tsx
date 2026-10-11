// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ROUTER_FUTURE_FLAGS } from '@/lib/routerFuture';
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

vi.mock('@/api/mealPlans', () => ({
  useMealPlan: mocks.useMealPlan,
  useScaleMealToTarget: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/pages/planning/RecipeSearchDialog', () => ({ default: () => null }));
vi.mock('@/api/refMeals', () => ({ useRefMeals: mocks.useRefMeals }));
vi.mock('@/api/breakfast', () => ({
  useBreakfastCatalog: mocks.useBreakfastCatalog,
  useSaveBreakfastWizard: mocks.useSaveBreakfastWizard,
  useSaveDirectMeal: mocks.useSaveDirectMeal,
  useSaveBreakfastBulk: mocks.useSaveBreakfastBulk,
}));
vi.mock('sonner', () => ({ toast: { warning: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/buffet/BuffetBuilder', () => ({
  BuffetBuilder: ({ open, initialTemplateSlug }: { open: boolean; initialTemplateSlug?: string }) => (
    open ? <div data-testid="free-buffet-dialog" data-initial-template={initialTemplateSlug} /> : null
  ),
}));
vi.mock('./StepBasis', () => ({
  default: ({ wiz }: { wiz: { state: { basis: Array<{ name: string; sharePercent: number }>; fatSelections: Array<{ name: string; sharePercent: number }> } } }) => (
    <>
      <output data-testid="breakfast-basis-state">
        {wiz.state.basis.map(({ name, sharePercent }) => `${name}:${sharePercent}`).join('|')}
      </output>
      <output data-testid="breakfast-fat-state">
        {wiz.state.fatSelections.map(({ name, sharePercent }) => `${name}:${sharePercent}`).join('|')}
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
    standard_measure_key: '',
    unit_kind: 'grams',
    unit_label: 'g',
    is_weight_approx: false,
    display_name: null,
    note: '',
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
    <MemoryRouter future={ROUTER_FUTURE_FLAGS} initialEntries={['/meal-plans/1/meals/2/breakfast-wizard']}>
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
    expect(screen.getByTestId('breakfast-fat-state')).toHaveTextContent('Deutsche Markenbutter:0|Kein Fett:100');
  });

  it('saves Nur Müsli with cereal and without fat or topping after visiting every step', async () => {
    const saveDirectMeal = vi.fn().mockResolvedValue(undefined);
    mocks.useSaveDirectMeal.mockReturnValue({ mutateAsync: saveDirectMeal, isPending: false });
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Nur Müsli/ }));
    for (let step = 0; step < 5; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));
    }
    fireEvent.click(screen.getByRole('button', { name: /Frühstück speichern/ }));

    await waitFor(() => expect(saveDirectMeal).toHaveBeenCalledTimes(1));
    const savedIngredientIds = saveDirectMeal.mock.calls[0][0].items.map((item: { ingredient_id?: number | null }) => item.ingredient_id);
    expect(savedIngredientIds).toContain(2);
    expect(savedIngredientIds).not.toContain(4);
    expect(savedIngredientIds).not.toContain(5);
  });

  it('shows a hint instead of selecting a cereal without kcal', () => {
    mocks.useBreakfastCatalog.mockReturnValue({
      data: {
        ...catalog,
        base_ingredients: catalog.base_ingredients.map((item) => ({ ...item, energy_kcal: item.id === 1 ? 250 : null })),
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Nur Müsli/ }));

    expect(screen.getByRole('status', { name: /Hinweise zum Frühstücksprofil/ })).toHaveTextContent('Kein Müsli und keine Haferflocken mit kcal-Angabe gefunden');
    expect(screen.getByTestId('breakfast-basis-state')).toHaveTextContent('Haferflocken:0|Cornflakes:0');
    expect(screen.getByRole('button', { name: /Weiter/ })).toBeDisabled();
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

  it('opens the generic builder directly on the free preset from the separate free-buffet option', () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /Freies Buffet/ }));
    expect(screen.getByTestId('free-buffet-dialog')).toHaveAttribute('data-initial-template', 'free');
  });
});
