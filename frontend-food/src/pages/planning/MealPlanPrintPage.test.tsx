// @vitest-environment jsdom
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MealPlanPrintPage from './MealPlanPrintPage';
import type { MealPlanDetail, Meal, MealItem } from '@/schemas/mealPlan';

vi.mock('@/api/mealPlans', () => ({
  useMealPlan: vi.fn(),
}));

import { useMealPlan } from '@/api/mealPlans';

// ==========================================================================
// Test Data Factories
// ==========================================================================

function makeMealItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: 1,
    recipe_id: null,
    recipe_title: '',
    recipe_slug: '',
    recipe_image: null,
    ingredient_id: null,
    ingredient_name: '',
    ingredient_slug: '',
    quantity: null,
    measuring_unit_id: null,
    measuring_unit_name: '',
    display_name: null,
    factor: 1,
    active_recipe_item_ids: [],
    variant_group_id: null,
    energy_kcal: null,
    cost_eur: null,
    quantity_g: null,
    ingredient_tags: [],
    recipe_type: '',
    overrides: [],
    portion_display: '',
    has_missing_weight: false,
    is_per_norm_person: true,
    ...overrides,
  };
}

function makeMeal(overrides: Partial<Meal> & { items?: MealItem[] } = {}): Meal {
  const { items, ...rest } = overrides;
  return {
    id: 1,
    start_datetime: '2026-07-15T08:00:00Z',
    end_datetime: '2026-07-15T09:00:00Z',
    meal_type: 'breakfast',
    day_part_factor: 1,
    display_name: 'Frühstück',
    override_portions: null,
    note: '',
    note_is_published: false,
    is_reference: false,
    ref_meal_id: null,
    is_synced: false,
    is_external: false,
    external_energy_kcal: null,
    external_cost_per_person: null,
    total_energy_kcal: 0,
    total_cost_eur: 0,
    items: items ?? [],
    ...rest,
  };
}

function makePlan(overrides: Partial<MealPlanDetail> = {}): MealPlanDetail {
  return {
    id: 1,
    name: 'Sommerlager 2026',
    slug: 'sommerlager-2026',
    description: 'Ein tolles Lager',
    norm_portions: 20,
    previous_norm_portions: 20,
    activity_factor: 1.5,
    reserve_factor: 1.15,
    budget_per_person_per_day: null,
    event_id: null,
    event_name: '',
    start_datetime: '2026-07-15T00:00:00Z',
    end_datetime: '2026-07-17T00:00:00Z',
    created_by_id: 1,
    owner_id: 1,
    owner_name: 'Max',
    visibility: 'private',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    day_part_factors: {},
    meal_default_times: {},
    meals: [],
    can_edit: true,
    is_owner: true,
    collaborators: [],
    tags: [],
    nutritional_tag_ids: [],
    nutritional_tags: [],
    is_template: false,
    has_group_members: false,
    group_members_count: 0,
    group_members: [],
    ...overrides,
  };
}

// ==========================================================================
// Tests
// ==========================================================================

describe('MealPlanPrintPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Loading State
  // --------------------------------------------------------------------------

  describe('Loading state', () => {
    it('renders a loading spinner while data is loading', () => {
      (useMealPlan as any).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Error State
  // --------------------------------------------------------------------------

  describe('Error state', () => {
    it('renders error message when API call fails', () => {
      (useMealPlan as any).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Not found'),
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('Essensplan nicht gefunden.')).toBeInTheDocument();
    });

    it('renders error message when plan is null', () => {
      (useMealPlan as any).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('Essensplan nicht gefunden.')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Empty State
  // --------------------------------------------------------------------------

  describe('Empty state', () => {
    it('shows empty message when plan has no meals', () => {
      const plan = makePlan({ meals: [] });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('Keine Mahlzeiten geplant.')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Header
  // --------------------------------------------------------------------------

  describe('Print header', () => {
    it('renders the plan name as h1', () => {
      const plan = makePlan({ name: 'Sommerlager 2026' });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sommerlager 2026');
    });

    it('shows portions and reserve factor', () => {
      const plan = makePlan({ norm_portions: 25, reserve_factor: 1.1 });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('25 Personen')).toBeInTheDocument();
      expect(screen.getByText('+10% Reserve')).toBeInTheDocument();
    });

    it('shows description when provided', () => {
      const plan = makePlan({ description: 'Tolles Lager mit viel Spaß' });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('Tolles Lager mit viel Spaß')).toBeInTheDocument();
    });

    it('does not render description paragraph when empty', () => {
      const plan = makePlan({ description: '' });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );
    });
  });

  // --------------------------------------------------------------------------
  // Day Sections & Page Breaks
  // --------------------------------------------------------------------------

  describe('Day sections and page breaks', () => {
    it('renders a day header for each distinct date', () => {
      const plan = makePlan({
        meals: [
          makeMeal({ id: 1, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
          makeMeal({ id: 2, start_datetime: '2026-07-16T08:00:00Z', meal_type: 'breakfast' }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      const dayHeaders = document.querySelectorAll('.meal-plan-print-day-header');
      expect(dayHeaders).toHaveLength(2);
    });

    it('renders day sections with meal-plan-print-day CSS class for page-break', () => {
      const plan = makePlan({
        meals: [
          makeMeal({ id: 1, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      const daySection = document.querySelector('.meal-plan-print-day');
      expect(daySection).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Meal Boxes
  // --------------------------------------------------------------------------

  describe('Meal boxes', () => {
    it('renders meal rows with meal-plan-print-meal-row CSS class', () => {
      const plan = makePlan({
        meals: [
          makeMeal({
            id: 1,
            start_datetime: '2026-07-15T08:00:00Z',
            meal_type: 'breakfast',
            items: [
              makeMealItem({
                id: 101,
                recipe_title: 'Pancakes',
                portion_display: '4 Port.',
              }),
            ],
          }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(document.querySelector('.meal-plan-print-meal-row')).toBeInTheDocument();
      expect(document.querySelector('.meal-plan-print-meal-box')).toBeInTheDocument();
    });

    it('renders the meal type label and time', () => {
      const plan = makePlan({
        meals: [
          makeMeal({
            id: 1,
            start_datetime: '2026-07-15T08:30:00',
            meal_type: 'breakfast',
          }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText(/Frühstück/)).toBeInTheDocument();
      const mealTime = document.querySelector('.meal-plan-print-meal-time');
      expect(mealTime).toBeInTheDocument();
      expect(mealTime!.textContent).toMatch(/\(\d{2}:\d{2} Uhr\)/);
    });

    it('renders ingredient list inside meal box', () => {
      const plan = makePlan({
        meals: [
          makeMeal({
            id: 1,
            start_datetime: '2026-07-15T08:00:00',
            meal_type: 'breakfast',
            items: [
              makeMealItem({
                id: 101,
                recipe_title: 'Pancakes',
                portion_display: '4 Port.',
              }),
              makeMealItem({
                id: 102,
                ingredient_name: 'Ahornsirup',
                quantity: 200,
                measuring_unit_name: 'ml',
              }),
            ],
          }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      const mealBox = document.querySelector('.meal-plan-print-ingredient-list') as HTMLElement;
      const withinMeal = within(mealBox);
      expect(withinMeal.getByText(/Pancakes \(4 Port\.\)/)).toBeInTheDocument();
      expect(withinMeal.getByText(/Ahornsirup \(200 ml\)/)).toBeInTheDocument();
    });

    it('shows placeholder for meals with no ingredient data', () => {
      const plan = makePlan({
        meals: [
          makeMeal({
            id: 1,
            start_datetime: '2026-07-15T08:00:00Z',
            meal_type: 'breakfast',
            items: [],
          }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('[Zutaten nicht verfügbar]')).toBeInTheDocument();
    });

    it('renders without errors when items is undefined', () => {
      const meal = makeMeal({
        id: 1,
        start_datetime: '2026-07-15T08:00:00Z',
        meal_type: 'breakfast',
      });
      delete (meal as any).items;
      const plan = makePlan({ meals: [meal] });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('[Zutaten nicht verfügbar]')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Notes Areas
  // --------------------------------------------------------------------------

  describe('Notes areas', () => {
    it('renders notes box beside each meal', () => {
      const plan = makePlan({
        meals: [
          makeMeal({ id: 1, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
          makeMeal({ id: 2, start_datetime: '2026-07-15T12:00:00Z', meal_type: 'lunch' }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      const notesBoxes = document.querySelectorAll('.meal-plan-print-notes-box');
      expect(notesBoxes).toHaveLength(2);
    });

    it('renders Notizen label in each notes box', () => {
      const plan = makePlan({
        meals: [
          makeMeal({ id: 1, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('Notizen')).toBeInTheDocument();
    });

    it('renders day-end notes lines (3 hr elements)', () => {
      const plan = makePlan({
        meals: [
          makeMeal({ id: 1, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      const dayNotes = document.querySelector('.meal-plan-print-day-notes');
      expect(dayNotes).toBeInTheDocument();
      expect(dayNotes!.querySelectorAll('hr')).toHaveLength(3);
    });
  });

  // --------------------------------------------------------------------------
  // Shopping List
  // --------------------------------------------------------------------------

  describe('Shopping list', () => {
    it('renders Einkaufsliste section heading', () => {
      const plan = makePlan({
        meals: [
          makeMeal({
            id: 1,
            start_datetime: '2026-07-15T08:00:00Z',
            meal_type: 'breakfast',
            items: [
              makeMealItem({
                ingredient_name: 'Mehl',
                quantity: 500,
                measuring_unit_name: 'g',
                quantity_g: 500,
              }),
            ],
          }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('Einkaufsliste')).toBeInTheDocument();
    });

    it('renders per-day and totals sections when ingredients exist', () => {
      const plan = makePlan({
        meals: [
          makeMeal({
            id: 1,
            start_datetime: '2026-07-15T08:00:00Z',
            meal_type: 'breakfast',
            items: [
              makeMealItem({
                ingredient_name: 'Apfel',
                quantity: 5,
                measuring_unit_name: 'Stück',
                quantity_g: 500,
              }),
            ],
          }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('Pro Tag')).toBeInTheDocument();
      expect(screen.getByText('Gesamt')).toBeInTheDocument();
    });

    it('shows fallback message when no ingredient data available', () => {
      const plan = makePlan({
        meals: [],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('Keine Mahlzeiten geplant.')).toBeInTheDocument();
    });

    it('shows ingredient name and display text in shopping list', () => {
      const plan = makePlan({
        meals: [
          makeMeal({
            id: 1,
            start_datetime: '2026-07-15T08:00:00',
            meal_type: 'breakfast',
            items: [
              makeMealItem({
                ingredient_name: 'Bananen',
                quantity: 10,
                measuring_unit_name: 'Stück',
                quantity_g: 1200,
              }),
            ],
          }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      const shoppingSection = document.querySelector('.meal-plan-print-shopping-list') as HTMLElement;
      const withinShopping = within(shoppingSection);
      const matches = withinShopping.getAllByText(/Bananen \(10 Stück\)/);
      expect(matches).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // Footer
  // --------------------------------------------------------------------------

  describe('Print footer', () => {
    it('renders footer with page numbering spans', () => {
      const plan = makePlan({
        meals: [
          makeMeal({ id: 1, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(document.querySelector('.meal-plan-print-footer')).toBeInTheDocument();
      expect(document.querySelector('.meal-plan-print-page-num')).toBeInTheDocument();
      expect(document.querySelector('.meal-plan-print-page-total')).toBeInTheDocument();
    });

    it('renders plan name in footer reference', () => {
      const plan = makePlan({
        name: 'Sommerlager',
        meals: [
          makeMeal({ id: 1, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText(/Sommerlager —/)).toBeInTheDocument();
      expect(screen.getByText(/Seite/)).toBeInTheDocument();
    });

    it('renders print button (hidden in print media)', () => {
      const plan = makePlan({
        meals: [
          makeMeal({ id: 1, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(screen.getByText('Drucken')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Multi-Day Plan Rendering
  // --------------------------------------------------------------------------

  describe('Multi-day plans', () => {
    it('renders 5 day sections for a 5-day plan', () => {
      const meals: Meal[] = [];
      for (let d = 0; d < 5; d++) {
        const date = `2026-07-${15 + d}`;
        meals.push(
          makeMeal({ id: d * 3 + 1, start_datetime: `${date}T08:00:00Z`, meal_type: 'breakfast' }),
          makeMeal({ id: d * 3 + 2, start_datetime: `${date}T12:00:00Z`, meal_type: 'lunch' }),
          makeMeal({ id: d * 3 + 3, start_datetime: `${date}T18:00:00Z`, meal_type: 'dinner' }),
        );
      }

      const plan = makePlan({ meals });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      const dayHeaders = document.querySelectorAll('.meal-plan-print-day-header');
      expect(dayHeaders).toHaveLength(5);

      const mealRows = document.querySelectorAll('.meal-plan-print-meal-row');
      expect(mealRows).toHaveLength(15);
    });
  });

  // --------------------------------------------------------------------------
  // CSS Structure Verification
  // --------------------------------------------------------------------------

  describe('CSS structure for print layout', () => {
    it('has the page wrapper with meal-plan-print-page class', () => {
      const plan = makePlan({
        meals: [
          makeMeal({ id: 1, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(document.querySelector('.meal-plan-print-page')).toBeInTheDocument();
      expect(document.querySelector('.meal-plan-print-content')).toBeInTheDocument();
    });

    it('has day headers with green accent CSS class', () => {
      const plan = makePlan({
        meals: [
          makeMeal({ id: 1, start_datetime: '2026-07-15T08:00:00Z', meal_type: 'breakfast' }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      const dayHeader = document.querySelector('.meal-plan-print-day-header');
      expect(dayHeader).toBeInTheDocument();
    });

    it('has shopping list section with proper CSS class', () => {
      const plan = makePlan({
        meals: [
          makeMeal({
            id: 1,
            start_datetime: '2026-07-15T08:00:00Z',
            meal_type: 'breakfast',
            items: [
              makeMealItem({
                ingredient_name: 'Test',
                quantity: 1,
                measuring_unit_name: 'g',
              }),
            ],
          }),
        ],
      });

      (useMealPlan as any).mockReturnValue({
        data: plan,
        isLoading: false,
        error: null,
      });

      render(
        <BrowserRouter>
          <MealPlanPrintPage />
        </BrowserRouter>,
      );

      expect(document.querySelector('.meal-plan-print-shopping-list')).toBeInTheDocument();
    });
  });
});
