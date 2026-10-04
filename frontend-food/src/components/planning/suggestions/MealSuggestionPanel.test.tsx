// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MealSuggestionPanel } from './MealSuggestionPanel';
import type { SuggestionFilters, SuggestionPanelResponse } from '@/schemas/mealPlan';

const { panelMutate, wandMutate, updateMutate } = vi.hoisted(() => ({
  panelMutate: vi.fn(),
  wandMutate: vi.fn(),
  updateMutate: vi.fn(),
}));

vi.mock('@/api/mealPlans', () => ({
  useSuggestionPanel: () => ({ mutate: panelMutate, isPending: false }),
  useSuggestionWand: () => ({ mutate: wandMutate, isPending: false }),
  useUpdateMealPlan: () => ({ mutate: updateMutate }),
}));
vi.mock('sonner', () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));

const FILTERS: SuggestionFilters = { taste: null, prep: null, kids: null, budget: null, diet: null, with_dessert: false };

function response(overrides: Partial<SuggestionPanelResponse> = {}): SuggestionPanelResponse {
  return {
    meal_type: 'snack',
    total: 3,
    relaxed_filters: [],
    missing_context: [],
    context: {
      age_groups: [],
      age_derived: false,
      setting: '',
      cooking_sources: [],
      cooling: '',
      season_hint: 'mild',
      season_derived: true,
    },
    filters: FILTERS,
    ai_used: false,
    seed: 5,
    directions: [
      {
        key: 'fruit_veg',
        label: 'Obst & Gemüse',
        hint: 'Frisch und gesund',
        cards: [
          {
            kind: 'ingredient',
            id: 7,
            title: 'Apfel',
            slug: 'apfel',
            type_label: 'Zutat',
            reason_text: 'Ohne Vorbereitung · kinderfreundlich',
            price_per_person: 0.12,
            recipe_type: null,
            badge: 'verified',
            is_new: false,
            portion_id: 11,
            measuring_unit_id: 3,
            quantity: 1,
          },
          {
            kind: 'ingredient',
            id: 8,
            title: 'Schokobanane',
            slug: 'schokobanane',
            type_label: 'Zutat',
            reason_text: '',
            price_per_person: null,
            recipe_type: null,
            badge: 'community',
            is_new: true,
            portion_id: 12,
            measuring_unit_id: 3,
            quantity: 1,
          },
        ],
      },
      {
        key: 'sweet',
        label: 'Süß',
        hint: '',
        cards: [
          {
            kind: 'recipe',
            id: 42,
            title: 'Popcorn',
            slug: 'popcorn',
            type_label: 'Rezept',
            reason_text: 'Süß',
            price_per_person: 0.3,
            recipe_type: 'snack',
            badge: 'verified',
            is_new: false,
            portion_id: null,
            measuring_unit_id: null,
            quantity: null,
          },
        ],
      },
      { key: 'savory', label: 'Herzhaft', hint: '', cards: [] },
    ],
    ...overrides,
  };
}

function setup(
  data: SuggestionPanelResponse = response(),
  added: { recipes?: number[]; ingredients?: number[] } = {},
) {
  panelMutate.mockImplementation((_vars, options) => options?.onSuccess?.(data));
  const onSelectRecipe = vi.fn();
  const onSelectIngredient = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <MealSuggestionPanel
      open
      onOpenChange={onOpenChange}
      planId={1}
      mealId={2}
      mealType="snack"
      targetLabel="Fr., 11.12."
      addedRecipeIds={new Set(added.recipes ?? [])}
      addedIngredientIds={new Set(added.ingredients ?? [])}
      onSelectRecipe={onSelectRecipe}
      onSelectIngredient={onSelectIngredient}
    />,
  );
  return { onSelectRecipe, onSelectIngredient, onOpenChange };
}

describe('MealSuggestionPanel', () => {
  beforeEach(() => {
    panelMutate.mockReset();
    wandMutate.mockReset();
    updateMutate.mockReset();
  });

  it('loads suggestions on open and shows image-free cards in directions', () => {
    setup();
    expect(panelMutate).toHaveBeenCalledWith({ filters: FILTERS, seed: null }, expect.anything());
    expect(screen.getByText('Obst & Gemüse')).toBeTruthy();
    expect(screen.getByText('Apfel')).toBeTruthy();
    expect(screen.getByText('Popcorn')).toBeTruthy();
    expect(screen.queryByText('Herzhaft', { selector: 'h3' })).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows type chip, price and "Neu" badge', () => {
    setup();
    expect(screen.getAllByText('Zutat').length).toBe(2);
    expect(screen.getByText('Rezept')).toBeTruthy();
    expect(screen.getByText('Neu')).toBeTruthy();
    expect(screen.getByText(/0,12/)).toBeTruthy();
  });

  it('adds an ingredient with its default portion and keeps the panel open', () => {
    const { onSelectIngredient, onOpenChange } = setup();
    fireEvent.click(screen.getByText('Apfel'));
    expect(onSelectIngredient).toHaveBeenCalledWith(7, 11, 3, 1, 'Apfel');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('marks cards of items already in the slot as added and re-enables them after an undo', () => {
    setup(response(), { ingredients: [7] });
    expect((screen.getAllByTestId('suggestion-card')[0] as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText('Hinzugefügt')).toBeTruthy();
    expect((screen.getAllByTestId('suggestion-card')[1] as HTMLButtonElement).disabled).toBe(false);
  });

  it('adds a recipe on click', () => {
    const { onSelectRecipe } = setup();
    fireEvent.click(screen.getByText('Popcorn'));
    expect(onSelectRecipe).toHaveBeenCalledWith(42, 'Popcorn');
  });

  it('reloads with the chip filter when a chip is toggled', () => {
    setup();
    panelMutate.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Süß' }));
    expect(panelMutate).toHaveBeenCalledWith(
      { filters: { ...FILTERS, taste: 'sweet' }, seed: 5 },
      expect.anything(),
    );
  });

  it('reshuffles with a new seed', () => {
    setup();
    panelMutate.mockClear();
    fireEvent.click(screen.getByText('Neu mischen'));
    const call = panelMutate.mock.calls[0][0] as { seed: number };
    expect(call.seed).not.toBe(5);
    expect(call.seed).toBeGreaterThan(0);
  });

  it('reports relaxed filters', () => {
    setup(response({ relaxed_filters: ['kids'], total: 6 }));
    expect(screen.getByText(/gelockert: Kinderfreundlich/)).toBeTruthy();
  });

  it('offers the assistant when context is missing', () => {
    setup(response({ missing_context: ['cooking_sources'] }));
    expect(screen.getByText(/Kochmöglichkeit/)).toBeTruthy();
    fireEvent.click(screen.getAllByText('Assistent starten')[0]);
    expect(screen.getByTestId('suggestion-assistant')).toBeTruthy();
  });

  it('only calls the magic wand after submitting a wish, not while typing', async () => {
    setup();
    wandMutate.mockImplementation((_vars, options) => options?.onSuccess?.(response({ ai_used: true })));
    fireEvent.change(screen.getByLabelText('Wunsch'), { target: { value: 'etwas mit Schokolade' } });
    expect(wandMutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Zauberstab/ }));
    await waitFor(() => expect(wandMutate).toHaveBeenCalledTimes(1));
    expect(wandMutate.mock.calls[0][0]).toEqual({ freeText: 'etwas mit Schokolade', filters: FILTERS, seed: 5 });
  });

  it('keeps the wand disabled for very short wishes', () => {
    setup();
    fireEvent.change(screen.getByLabelText('Wunsch'), { target: { value: 'x' } });
    expect((screen.getByRole('button', { name: /Zauberstab/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('saves context answers from the assistant on the plan', () => {
    setup(response({ missing_context: ['age_groups'] }));
    fireEvent.click(screen.getAllByText('Assistent starten')[0]);
    fireEvent.click(screen.getByText('Kinder (6–11)'));
    expect(updateMutate).toHaveBeenCalledWith({ age_groups: ['children'] }, expect.anything());
  });
});
