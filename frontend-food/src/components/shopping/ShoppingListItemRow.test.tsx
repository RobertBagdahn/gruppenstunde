import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ShoppingListItemRow from './ShoppingListItemRow';
import { ShoppingListItemSchema, type ShoppingListItem } from '@/schemas/shoppingList';

function item(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return ShoppingListItemSchema.parse({
    id: 1,
    name: 'Salz',
    quantity_g: 320,
    unit: 'g',
    is_checked: false,
    sort_order: 0,
    estimated_price_eur: 1.5,
    piece_equivalent: { count: 64, portion_name: 'TL' },
    ...overrides,
  });
}

function renderRow(i: ShoppingListItem) {
  return render(
    <MemoryRouter>
      <ShoppingListItemRow item={i} canEdit onCheck={vi.fn()} />
    </MemoryRouter>,
  );
}

describe('ShoppingListItemRow', () => {
  it('shows amount first and piece equivalent second', () => {
    renderRow(item());
    expect(screen.getByText('320 g · ≈ 64 TL')).toBeInTheDocument();
    expect(screen.getByText('1,50 €')).toBeInTheDocument();
  });

  it('uses German decimals for kilograms and fractional pieces', () => {
    renderRow(item({ quantity_g: 1300, piece_equivalent: { count: 2.5, portion_name: 'Stück' } }));
    expect(screen.getByText('1,3 kg · ≈ 2,5 Stück')).toBeInTheDocument();
  });

  it('shows only the amount without piece equivalent', () => {
    renderRow(item({ piece_equivalent: null }));
    expect(screen.getByText('320 g')).toBeInTheDocument();
  });

  it('expands portion options with exact portion weights', () => {
    renderRow(
      item({
        portion_options: [
          { name: 'TL', is_default: true, weight_g: 5, count: 64 },
          { name: 'EL', is_default: false, weight_g: 15, count: 21.3 },
        ],
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Portionsgrößen/ }));
    expect(screen.getByText('64 × TL (à 5 g)')).toBeInTheDocument();
    expect(screen.getByText('21,3 × EL (à 15 g)')).toBeInTheDocument();
  });
});
