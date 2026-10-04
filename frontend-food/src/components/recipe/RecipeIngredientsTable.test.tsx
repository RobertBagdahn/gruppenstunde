// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RecipeItemSchema } from '@/schemas/recipe';
import RecipeIngredientsTable from './RecipeIngredientsTable';

const items = [
  RecipeItemSchema.parse({
    id: 1, portion_id: 10, portion_name: 'Portion trocken (100g)', measuring_unit_name: 'Gramm',
    ingredient_id: 5, ingredient_name: 'Spaghetti', quantity: 1, sort_order: 0, note: '', weight_g: 100,
  }),
  RecipeItemSchema.parse({
    id: 2, portion_id: 11, portion_name: 'mittelgroße Zwiebel', measuring_unit_name: 'Gramm',
    ingredient_id: 6, ingredient_name: 'Zwiebel', quantity: 0.31, sort_order: 1, note: '', weight_g: 24.8,
  }),
];

describe('RecipeIngredientsTable', () => {
  it('shows portion units like the detail page instead of grams', () => {
    render(
      <MemoryRouter>
        <RecipeIngredientsTable items={items} portions={1} />
      </MemoryRouter>,
    );

    expect(screen.getByText('1 Portion trocken (100g)')).toBeTruthy();
    expect(screen.getByText('100 g')).toBeTruthy();
    expect(screen.getByText('0,31 mittelgroße Zwiebel')).toBeTruthy();
    expect(screen.queryByText('1 g')).toBeNull();
    expect(screen.queryByText('0,31 g')).toBeNull();
  });
});
