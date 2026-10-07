// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { MealItem } from '@/schemas/mealPlan';
import { MealItemAmountEditor, MealItemAmountText, MealItemNote } from './MealItemAmountEditor';

const portions = [
  { id: 1, name: 'Gramm', quantity: 1, weight_g: 1, rank: 1, is_default: true, measuring_unit_id: 1, measuring_unit_name: 'Gramm' },
  { id: 2, name: 'EL', quantity: 1, weight_g: 30, rank: 2, is_default: false, measuring_unit_id: 1, measuring_unit_name: 'Gramm' },
];

vi.mock('@/api/supplies', () => ({
  useIngredientPortions: () => ({ data: portions }),
  useStandardMeasures: () => ({ data: [] }),
}));

const item: MealItem = {
  id: 9,
  recipe_id: null,
  recipe_title: '',
  recipe_slug: '',
  image_url: null,
  ingredient_id: 3,
  ingredient_name: 'Frischkäse',
  ingredient_slug: 'frischkaese',
  quantity: 0.5,
  measuring_unit_id: 1,
  measuring_unit_name: 'Gramm',
  portion_id: 2,
  portion_name: 'EL',
  display_name: null,
  note: '',
  factor: 1,
  active_recipe_item_ids: [],
  variant_group_id: null,
  energy_kcal: 37,
  cost_eur: 0.1,
  quantity_g: 15,
  ingredient_tags: [],
  recipe_type: '',
  overrides: [],
  has_missing_weight: false,
  is_per_norm_person: true,
  buffet_role: '',
  is_breakfast_assistant: false,
  warnings: [],
};

function wrap(node: ReactNode) {
  return <QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>;
}

describe('MealItemAmountText', () => {
  it('names the portion instead of its gram unit', () => {
    render(<MealItemAmountText item={item} />);
    expect(screen.getByText(/0,5 EL/)).toBeTruthy();
    expect(screen.queryByText(/Gramm/)).toBeNull();
  });
});

describe('MealItemAmountEditor', () => {
  it('sends only the new portion on a unit change so the backend keeps the grams', () => {
    const onUpdateItem = vi.fn();
    render(wrap(<MealItemAmountEditor item={item} onUpdateItem={onUpdateItem} />));

    fireEvent.click(screen.getByRole('button', { name: 'Portion wählen' }));
    fireEvent.click(screen.getByRole('option', { name: /Gramm/ }));

    expect(onUpdateItem).toHaveBeenCalledWith(9, { portion_id: 1 });
  });

  it('sends the quantity typed in the chosen unit', () => {
    const onUpdateItem = vi.fn();
    render(wrap(<MealItemAmountEditor item={item} onUpdateItem={onUpdateItem} />));

    const input = screen.getByDisplayValue('0,5');
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.blur(input);

    expect(onUpdateItem).toHaveBeenCalledWith(9, { quantity: 2 });
  });
});

describe('MealItemNote', () => {
  it('saves an edited note on blur', () => {
    const onUpdateItem = vi.fn();
    render(<MealItemNote item={item} canEdit onUpdateItem={onUpdateItem} />);

    fireEvent.click(screen.getByRole('button', { name: 'Notiz hinzufügen' }));
    const input = screen.getByLabelText('Notiz zu Frischkäse');
    fireEvent.change(input, { target: { value: ' ohne Zwiebeln ' } });
    fireEvent.blur(input);

    expect(onUpdateItem).toHaveBeenCalledWith(9, { note: 'ohne Zwiebeln' });
  });

  it('shows the note as plain text when not editable', () => {
    render(<MealItemNote item={{ ...item, note: 'Bio' }} canEdit={false} />);
    expect(screen.getByText('Bio')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
