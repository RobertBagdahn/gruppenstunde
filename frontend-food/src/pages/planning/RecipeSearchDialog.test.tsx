// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { IngredientSearchResult } from '@/schemas/mealPlan';
import { IngredientQuantityInline } from './RecipeSearchDialog';

const ingredient: IngredientSearchResult = {
  id: 4,
  name: 'Olivenöl',
  slug: 'olivenoel',
  portions: [
    {
      id: 12,
      name: 'Esslöffel',
      measuring_unit: 'EL',
      measuring_unit_id: 3,
      quantity: 1,
      weight_g: 15,
    },
  ],
};

describe('RecipeSearchDialog ingredient quantity input', () => {
  it('accepts a leading-zero decimal comma and confirms its numeric value', () => {
    const onConfirm = vi.fn();
    render(
      <IngredientQuantityInline
        ingredient={ingredient}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    const input = screen.getByLabelText('Menge') as HTMLInputElement;

    fireEvent.change(input, { target: { value: '0,' } });
    expect(input.value).toBe('0,');
    expect(screen.getByRole('button', { name: 'Hinzufügen' })).toBeDisabled();

    fireEvent.change(input, { target: { value: '0,6' } });
    expect(input.value).toBe('0,6');
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    expect(onConfirm).toHaveBeenCalledWith(4, ingredient.portions[0], 0.6, '');
  });

  it('passes the trimmed note with the confirmed amount', () => {
    const onConfirm = vi.fn();
    render(<IngredientQuantityInline ingredient={ingredient} onConfirm={onConfirm} onCancel={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Notiz (optional)'), { target: { value: '  Bio  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen' }));

    expect(onConfirm).toHaveBeenCalledWith(4, ingredient.portions[0], 1, 'Bio');
  });
});
