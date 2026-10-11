// @vitest-environment jsdom
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { IngredientPortion } from '@/schemas/mealPlan';
import { useWizardState } from './useWizardState';
import StepExtras from './StepExtras';

const tomatoPastePortion: IngredientPortion = {
  id: 501,
  name: 'EL',
  measuring_unit: 'Esslöffel',
  measuring_unit_id: 12,
  quantity: 1,
  weight_g: 15,
};

vi.mock('../RecipeSearchDialog', () => ({
  default: ({ onSelectIngredient }: {
    onSelectIngredient?: (
      ingredientId: number,
      portionId: number | null,
      measuringUnitId: number | null,
      quantity: number,
      ingredientName: string,
      note?: string,
      portion?: IngredientPortion | null,
    ) => void;
  }) => (
    <button type="button" onClick={() => onSelectIngredient?.(99, 501, 12, 2, 'Tomatenmark', '', tomatoPastePortion)}>
      Tomatenmark wählen
    </button>
  ),
}));

function StepExtrasHarness({ warmDishRecipeIds = [] }: { warmDishRecipeIds?: number[] }) {
  // Stable initial state: useWizardState re-applies it whenever the object identity changes.
  const [initialState] = useState(() => ({
    warmDishRecipeIds,
    warmDishFactors: Object.fromEntries(warmDishRecipeIds.map((id) => [String(id), 1])),
    warmDishRecipeNames: Object.fromEntries(warmDishRecipeIds.map((id) => [String(id), 'Rührei'])),
  }));
  const wiz = useWizardState(initialState, 'extras');
  return (
    <>
      <StepExtras wiz={wiz} />
      <output data-testid="extras-state">
        {JSON.stringify({
          extraIngredients: wiz.state.extraIngredients,
          extraIngredientSelections: wiz.state.extraIngredientSelections,
          warmDishFactors: wiz.state.warmDishFactors,
        })}
      </output>
    </>
  );
}

function extrasState() {
  return JSON.parse(screen.getByTestId('extras-state').textContent ?? '{}') as {
    extraIngredients: Record<string, number>;
    extraIngredientSelections: Record<string, { portionId: number; quantity: number; weightG: number | null; portionName: string }>;
    warmDishFactors: Record<string, number>;
  };
}

describe('StepExtras', () => {
  it('keeps the portion and amount of a freely searched extra', () => {
    render(<StepExtrasHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Tomatenmark wählen' }));

    expect(extrasState().extraIngredients).toEqual({ '99': 30 });
    expect(extrasState().extraIngredientSelections['99']).toMatchObject({ portionId: 501, quantity: 2, weightG: 15, portionName: 'EL' });
  });

  it('accepts decimal warm dish factors without clamping while typing', () => {
    render(<StepExtrasHarness warmDishRecipeIds={[42]} />);
    const factorInput = screen.getByRole('textbox', { name: 'Faktor für Rührei' });

    fireEvent.focus(factorInput);
    fireEvent.change(factorInput, { target: { value: '0' } });
    expect(factorInput).toHaveValue('0');
    expect(extrasState().warmDishFactors['42']).toBe(1);

    fireEvent.change(factorInput, { target: { value: '0,5' } });
    expect(extrasState().warmDishFactors['42']).toBe(0.5);
  });
});
