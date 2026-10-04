import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import IngredientList from './IngredientList';
import type { RecipeItem } from '@/schemas/recipe';

function makeItem(id: number, name: string, weightG: number, pricePerKg: number | null): RecipeItem {
  return {
    id,
    portion_id: null,
    ingredient_name: name,
    quantity: weightG,
    sort_order: id,
    note: '',
    ingredient_portions: [],
    ingredient_price_per_kg: pricePerKg,
    weight_g: weightG,
    is_optional: false,
    portion_display: '',
    has_missing_weight: false,
  } as RecipeItem;
}

function renderList(items: RecipeItem[], route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <IngredientList items={items} portions={4} portionsMultiplier={1} />
    </MemoryRouter>,
  );
}

describe('IngredientList', () => {
  it('flags a clearly dominant cost driver', () => {
    renderList([makeItem(1, 'Safran', 100, 100), makeItem(2, 'Reis', 100, 2), makeItem(3, 'Salz', 100, 1)]);
    expect(screen.getAllByText('Kostentreiber')).toHaveLength(1);
  });

  it('does not flag a cost driver when the most expensive item leads only narrowly', () => {
    renderList([makeItem(1, 'Käse', 100, 10), makeItem(2, 'Fleisch', 100, 9), makeItem(3, 'Salz', 100, 1)]);
    expect(screen.queryByText('Kostentreiber')).toBeNull();
  });

  it('does not flag a cost driver for a single ingredient', () => {
    renderList([makeItem(1, 'Safran', 100, 100)]);
    expect(screen.queryByText('Kostentreiber')).toBeNull();
  });

  it('warns when an ingredient dominates the amount', () => {
    renderList([makeItem(1, 'Wasser', 1000, null), makeItem(2, 'Tee', 10, null)]);
    expect(screen.getAllByText('Dominiert das Rezept')).toHaveLength(1);
  });

  it('shows total and unpriced count', () => {
    renderList([makeItem(1, 'Tee', 100, 30), makeItem(2, 'Wasser', 100, null)]);
    expect(screen.getByText(/Gesamt 3,00 €/)).toBeTruthy();
    expect(screen.getByText('(1 ohne Preis)')).toBeTruthy();
  });

  it('hides the facts row by default', () => {
    renderList([makeItem(1, 'Tee', 100, 30), makeItem(2, 'Reis', 100, 2)]);
    expect(screen.queryByText('30,00 €/kg')).toBeNull();
    expect((screen.getByLabelText('Details') as HTMLInputElement).checked).toBe(false);
  });

  it('shows the facts of all rows with "Details" and of one tapped row', () => {
    renderList([makeItem(1, 'Tee', 100, 30), makeItem(2, 'Reis', 100, 2)], '/?ingredient_view=details');
    expect(screen.getByText('30,00 €/kg')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Details'));
    expect(screen.queryByText('30,00 €/kg')).toBeNull();
    fireEvent.click(screen.getAllByText('Tee')[0].closest('li')!);
    expect(screen.getByText('30,00 €/kg')).toBeTruthy();
  });
});
