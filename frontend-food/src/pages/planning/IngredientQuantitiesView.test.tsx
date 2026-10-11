import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IngredientQuantitiesView, { fixedShareG, formatNetAmount } from './IngredientQuantitiesView';
import {
  useAdjustIngredientQuantity,
  useIngredientQuantities,
  useSetMealItemOverrideLine,
  useUpdateMealItem,
} from '@/api/mealPlans';
import { IngredientQuantitySchema, type IngredientQuantity, type IngredientQuantityLine } from '@/schemas/mealPlan';

vi.mock('@/api/mealPlans', () => ({
  useIngredientQuantities: vi.fn(),
  useAdjustIngredientQuantity: vi.fn(),
  useSetMealItemOverrideLine: vi.fn(),
  useUpdateMealItem: vi.fn(),
}));

const adjustMutate = vi.fn();
const lineMutate = vi.fn();
const updateMutate = vi.fn();

function line(overrides: Partial<IngredientQuantityLine> = {}): IngredientQuantityLine {
  return {
    kind: 'recipe',
    meal_item_id: 1,
    recipe_item_id: 11,
    meal_id: 100,
    meal_type: 'lunch',
    meal_start_datetime: '2026-10-10T10:00:00Z',
    meal_label: 'Sa, 10.10. · Mittagessen',
    recipe_id: 5,
    recipe_title: 'Sweet Onion Sauce',
    quantity_per_person: 2,
    original_quantity_per_person: 2,
    unit_label: 'mittelgroße Zwiebel',
    factor: 1,
    effective_portions: 35,
    net_quantity_g: 5600,
    excluded: false,
    is_overridden: false,
    editable: true,
    not_editable_reason: null,
    ...overrides,
  };
}

function onion(lines: IngredientQuantityLine[]): IngredientQuantity {
  return IngredientQuantitySchema.parse({
    ingredient_id: 7,
    ingredient_name: 'Zwiebel',
    ingredient_slug: 'zwiebel',
    retail_section: 'Gemüse',
    net_quantity_g: lines.reduce((sum, entry) => sum + entry.net_quantity_g, 0),
    total_quantity_g: lines.reduce((sum, entry) => sum + entry.net_quantity_g, 0),
    unit_options: [{ name: 'mittelgroße Zwiebel', weight_g: 80, is_default: true }],
    lines,
  });
}

function renderView(items: IngredientQuantity[], canEdit = true) {
  vi.mocked(useIngredientQuantities).mockReturnValue({
    data: items,
    error: null,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  } as never);
  return render(
    <MemoryRouter>
      <IngredientQuantitiesView mealPlanId={18} canEdit={canEdit} />
    </MemoryRouter>,
  );
}

describe('IngredientQuantitiesView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAdjustIngredientQuantity).mockReturnValue({ mutate: adjustMutate, isPending: false } as never);
    vi.mocked(useSetMealItemOverrideLine).mockReturnValue({ mutate: lineMutate } as never);
    vi.mocked(useUpdateMealItem).mockReturnValue({ mutate: updateMutate } as never);
  });

  it('computes the fixed share from non-adjustable lines', () => {
    const item = onion([line(), line({ meal_item_id: 2, editable: false, net_quantity_g: 300 })]);
    expect(fixedShareG(item)).toBe(300);
    expect(formatNetAmount(item, 5900)).toBe('5,9 kg · ≈ 73,8 mittelgroße Zwiebel');
  });

  it('shows totals and per-meal lines', () => {
    renderView([onion([line()])]);

    expect(screen.getByText('Zwiebel')).toBeInTheDocument();
    expect(screen.getByText(/5,6 kg · ≈ 70 mittelgroße Zwiebel/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Zwiebel/ }));
    expect(screen.getByText('Sweet Onion Sauce')).toBeInTheDocument();
    expect(screen.getByText(/Sa, 10.10. · Mittagessen · 35 Pers./)).toBeInTheDocument();
  });

  it('sends the target total in grams converted from the chosen unit', () => {
    renderView([onion([line()])]);

    fireEvent.click(screen.getByRole('button', { name: 'Gesamtmenge anpassen' }));
    const dialog = screen.getByRole('dialog');
    const amount = within(dialog).getByLabelText('Zielmenge');
    fireEvent.focus(amount);
    fireEvent.change(amount, { target: { value: '18' } });
    fireEvent.blur(amount);
    expect(within(dialog).getByText(/1,4 kg · ≈ 18 mittelgroße Zwiebel/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Übernehmen' }));

    expect(adjustMutate).toHaveBeenCalledWith(
      { ingredientId: 7, body: { mode: 'target_total', target_total_g: 1440 } },
      expect.anything(),
    );
  });

  it('saves an inline per-person quantity as override', () => {
    renderView([onion([line({ quantity_per_person: 2 })])]);

    fireEvent.click(screen.getByRole('button', { name: /Zwiebel/ }));
    const input = screen.getByTestId('line-quantity-input');
    fireEvent.change(input, { target: { value: '0,5' } });
    fireEvent.blur(input);

    expect(lineMutate).toHaveBeenCalledWith(
      { itemId: 1, recipeItemId: 11, body: { quantity_override: 0.5, excluded: false } },
      expect.anything(),
    );
  });

  it('is read-only without edit permission', () => {
    renderView([onion([line()])], false);

    expect(screen.queryByRole('button', { name: 'Gesamtmenge anpassen' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Zwiebel/ }));
    expect(screen.queryByTestId('line-quantity-input')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Weglassen' })).not.toBeInTheDocument();
  });

  it('explains why a line cannot be edited', () => {
    renderView([
      onion([line(), line({ meal_item_id: 2, editable: false, not_editable_reason: 'Mahlzeit ist mit einer Vorlage verknüpft' })]),
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Zwiebel/ }));
    expect(screen.getByText('Mahlzeit ist mit einer Vorlage verknüpft')).toBeInTheDocument();
  });
});
