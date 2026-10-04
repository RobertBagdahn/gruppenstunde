// @vitest-environment jsdom
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MealSlot } from './MealSlot';
import type { Meal, MealItem } from '@/schemas/mealPlan';

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: '1' }), useNavigate: () => mockNavigate };
});

vi.mock('@/api/mealPlans', () => ({
  useIngredientScan: () => ({ data: undefined }),
}));

vi.mock('@/components/buffet/BuffetBuilder', () => ({
  BuffetBuilder: ({ open }: { open: boolean }) => (open ? <div data-testid="buffet-builder-open" /> : null),
}));
vi.mock('@/components/planning/MealOmnibarDialog', () => ({ MealOmnibarDialog: () => null }));
vi.mock('@/components/planning/suggestions/MealSuggestionPanel', () => ({
  MealSuggestionPanel: ({ open }: { open: boolean }) => (open ? <div data-testid="suggestion-panel-open" /> : null),
}));
vi.mock('@/components/planning/MealActionsMenu', () => ({ MealActionsMenu: () => null }));
vi.mock('@/components/recipe/RecipeThumbnail', () => ({ default: () => null }));

function makeItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: 1,
    recipe_id: null,
    recipe_title: '',
    recipe_slug: '',
    image_url: null,
    ingredient_id: 10,
    ingredient_name: 'Baguette',
    ingredient_slug: 'baguette',
    quantity: 150,
    measuring_unit_id: 1,
    measuring_unit_name: 'Gramm',
    display_name: null,
    factor: 1,
    active_recipe_item_ids: [],
    variant_group_id: null,
    energy_kcal: 375,
    cost_eur: 0.45,
    quantity_g: 150,
    ingredient_tags: [],
    recipe_type: '',
    overrides: [],
    has_missing_weight: false,
    is_per_norm_person: true,
    buffet_role: '',
    is_breakfast_assistant: false,
    warnings: [],
    ...overrides,
  };
}

function makeMeal(items: MealItem[], overrides: Partial<Meal> = {}): Meal {
  return {
    id: 5,
    start_datetime: null,
    end_datetime: null,
    meal_type: 'lunch',
    day_part_factor: 0.35,
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
    total_energy_kcal: items.reduce((s, i) => s + (i.energy_kcal ?? 0), 0),
    total_cost_eur: items.reduce((s, i) => s + (i.cost_eur ?? 0), 0),
    price_coverage: null,
    items,
    ...overrides,
  };
}

const noop = vi.fn();

function renderMealSlot(meal: Meal, canEdit = true) {
  return render(
    <MemoryRouter>
      <MealSlot
        meal={meal}
        canEdit={canEdit}
        normPortions={4}
        onDeleteMeal={noop}
        onAddRecipe={noop}
        onAddIngredient={noop}
        onDeleteItem={noop}
        onUpdateItemFactor={noop}
        onUpdateMeal={noop}
        onScaleMeal={noop}
        onCopyFromPlan={noop}
      />
    </MemoryRouter>,
  );
}

function openDetails() {
  fireEvent.click(screen.getByText('Mittagessen'));
}

describe('MealSlot buffet grouping', () => {
  it('groups a lunch meal with buffet-role items by role, in role order', () => {
    const meal = makeMeal([
      makeItem({ id: 1, ingredient_name: 'Nutella', buffet_role: 'buffet-sweet' }),
      makeItem({ id: 2, ingredient_name: 'Baguette', buffet_role: 'buffet-bread' }),
      makeItem({ id: 3, ingredient_name: 'Gouda', buffet_role: 'buffet-savory' }),
    ]);
    renderMealSlot(meal);
    openDetails();

    const headings = screen.getAllByText(/^(Brot & Gebäck|Belag herzhaft|Belag süß)$/).map((el) => el.textContent);
    expect(headings).toEqual(['Brot & Gebäck', 'Belag herzhaft', 'Belag süß']);
  });

  it('falls back to the first buffet role tag when buffet_role is not set', () => {
    const meal = makeMeal([
      makeItem({ id: 1, ingredient_name: 'Alt-Gouda', buffet_role: '', ingredient_tags: ['buffet-savory'] }),
    ]);
    renderMealSlot(meal);
    openDetails();

    expect(screen.getByText('Belag herzhaft')).toBeInTheDocument();
    expect(screen.getAllByText('Alt-Gouda').length).toBeGreaterThan(0);
  });

  it('shows items without any buffet role as individual cards under "Weitere"', () => {
    const meal = makeMeal([
      makeItem({ id: 1, ingredient_name: 'Baguette', buffet_role: 'buffet-bread' }),
      makeItem({ id: 2, ingredient_name: 'Obstsalat', recipe_id: 7, recipe_title: 'Obstsalat', ingredient_id: null, buffet_role: '' }),
    ]);
    renderMealSlot(meal);
    openDetails();

    expect(screen.getByText('Brot & Gebäck')).toBeInTheDocument();
    expect(screen.queryByText('Weitere')).not.toBeInTheDocument();
    expect(screen.getAllByText('Obstsalat').length).toBeGreaterThan(0);
  });

  it('renders the plain single-card layout when no item has a buffet role', () => {
    const meal = makeMeal([makeItem({ id: 1, ingredient_name: 'Kartoffeln', buffet_role: '' })]);
    renderMealSlot(meal);
    openDetails();

    expect(screen.queryByText('Brot & Gebäck')).not.toBeInTheDocument();
    expect(screen.getAllByText('Kartoffeln').length).toBeGreaterThan(0);
  });

  it('offers "Buffet zusammenstellen" for lunch', () => {
    const lunch = makeMeal([makeItem({ id: 1, buffet_role: 'buffet-bread' })], { meal_type: 'lunch' });
    renderMealSlot(lunch);
    openDetails();
    expect(screen.getByText('Im Buffet-Builder bearbeiten')).toBeInTheDocument();
  });

  it('shows a warning icon on an item with plausibility warnings', () => {
    const meal = makeMeal([
      makeItem({
        id: 1,
        ingredient_name: 'Brötchen',
        buffet_role: 'buffet-bread',
        warnings: [
          {
            ingredient_name: 'Brötchen',
            per_person_value: 800,
            per_person_unit: 'Stück',
            total_value: 8000,
            total_unit: 'Stück',
            message: 'Brötchen: 800 Stück pro Person (8000 insgesamt) – bitte Menge und Einheit prüfen.',
          },
        ],
      }),
    ]);
    renderMealSlot(meal);
    openDetails();

    expect(screen.getByTitle(/bitte Menge und Einheit prüfen/)).toBeInTheDocument();
  });
});

describe('MealSlot energy status', () => {
  // lunch: day_part_factor 0.35 → target 817 kcal per person; normPortions = 4
  const targetTotalKcal = 2335 * 0.35 * 4;

  it('shows "Zu wenig Energie (x %)" when the meal reaches less than 80 %', () => {
    renderMealSlot(makeMeal([makeItem({ energy_kcal: targetTotalKcal * 0.6 })]));
    expect(screen.getByText('Zu wenig Energie (60 %)')).toBeInTheDocument();
    expect(screen.queryByText('Essen reicht nicht')).toBeNull();
  });

  it('shows no energy warning when the meal covers its target', () => {
    renderMealSlot(makeMeal([makeItem({ energy_kcal: targetTotalKcal })]));
    expect(screen.queryByText(/Zu wenig Energie/)).toBeNull();
    openDetails();
    expect(screen.getByTitle('Energie ok')).toBeInTheDocument();
  });
});

describe('MealSlot buffet builder trigger', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('opens the breakfast wizard from an empty breakfast meal', () => {
    renderMealSlot(makeMeal([], { meal_type: 'breakfast' }));
    fireEvent.click(screen.getByText('Frühstücksassistent starten'));
    expect(mockNavigate).toHaveBeenCalledWith('/meal-plans/1/meals/5/breakfast-wizard');
    expect(screen.queryByTestId('buffet-builder-open')).not.toBeInTheDocument();
  });

  it('opens the buffet builder from an empty meal (regression: dialog was not rendered)', () => {
    renderMealSlot(makeMeal([], { meal_type: 'snack' }));
    expect(screen.queryByTestId('buffet-builder-open')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Buffet zusammenstellen'));
    expect(screen.getByTestId('buffet-builder-open')).toBeInTheDocument();
  });

  it('opens the buffet builder from an empty drinks meal', () => {
    renderMealSlot(makeMeal([], { meal_type: 'drinks' }));
    fireEvent.click(screen.getByText('Buffet zusammenstellen'));
    expect(screen.getByTestId('buffet-builder-open')).toBeInTheDocument();
  });

  it('opens the buffet builder from a filled meal', () => {
    renderMealSlot(makeMeal([makeItem({ id: 1, buffet_role: 'buffet-bread' })], { meal_type: 'lunch' }));
    openDetails();
    fireEvent.click(screen.getByText('Im Buffet-Builder bearbeiten'));
    expect(screen.getByTestId('buffet-builder-open')).toBeInTheDocument();
  });
});
