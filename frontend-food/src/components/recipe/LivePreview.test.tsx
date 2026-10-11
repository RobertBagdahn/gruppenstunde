// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import LivePreview from './LivePreview';
import { RecipeStepIngredientSchema } from '@/schemas/recipeStep';

describe('LivePreview', () => {
  it('resolves step placeholders to the step ingredient amount and name', () => {
    const stepIngredients = [
      RecipeStepIngredientSchema.parse({
        id: 1,
        recipe_item_id: 42,
        ingredient_name: 'Sojagranulat',
        portion_name: 'Portion',
        unit_short: 'Portion',
        quantity: 0.35,
        weight_g: 17.5,
      }),
      RecipeStepIngredientSchema.parse({
        id: 2,
        recipe_item_id: 43,
        ingredient_name: 'Reis',
        unit_short: 'g',
        quantity: 80,
        weight_g: 80,
      }),
    ];

    render(<LivePreview instruction="{1} mit {2} mischen" stepIngredients={stepIngredients} />);

    expect(screen.getByText('0,35 Portion (18 g) Sojagranulat mit 80 g Reis mischen')).toBeInTheDocument();
  });
});
