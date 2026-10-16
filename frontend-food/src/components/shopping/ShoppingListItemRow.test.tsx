import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ROUTER_FUTURE_FLAGS } from '@/lib/routerFuture';
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
    ...overrides,
  });
}

const startUnit = (label: string, gramsPerUnit: number, kind: 'portion' | 'standard' = 'portion') => ({
  key: `${kind}:${label}`,
  kind,
  label,
  grams_per_unit: gramsPerUnit,
  is_approx: false,
  has_weight: true,
  portion_id: kind === 'portion' ? 11 : null,
  measuring_unit_id: null,
  standard_measure_key: kind === 'standard' ? 'el' : null,
});

function withProviders(children: React.ReactNode) {
  return (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter future={ROUTER_FUTURE_FLAGS}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

function renderRow(i: ShoppingListItem, onUpdateQuantity?: (id: number, grams: number) => void) {
  return render(
    withProviders(<ShoppingListItemRow item={i} canEdit onCheck={vi.fn()} onUpdateQuantity={onUpdateQuantity} />),
  );
}

describe('ShoppingListItemRow', () => {
  it('shows the start unit with its grams', () => {
    renderRow(item({ ingredient_id: 7, start_unit: startUnit('TL', 5) }));
    expect(screen.getByText('64 TL (320 g)')).toBeInTheDocument();
    expect(screen.getByText('1,50 €')).toBeInTheDocument();
  });

  it('uses German decimals for fractional pieces and kilograms', () => {
    renderRow(item({ ingredient_id: 7, quantity_g: 1300, start_unit: startUnit('Stück', 520) }));
    expect(screen.getByText('2,5 Stück (1,3 kg)')).toBeInTheDocument();
  });

  it('shows 24 Stück with 1,4 kg like in the screenshot case', () => {
    renderRow(item({ name: 'Brötchen', ingredient_id: 9, quantity_g: 1440, start_unit: startUnit('Stück', 60) }));
    expect(screen.getByText('24 Stück (1,4 kg)')).toBeInTheDocument();
  });

  it('shows only the gram amount without an ingredient or start unit', () => {
    renderRow(item());
    expect(screen.getByText('320 g')).toBeInTheDocument();
  });

  it('puts the package need after the start unit', () => {
    renderRow(
      item({
        ingredient_id: 7,
        quantity_g: 700,
        start_unit: startUnit('Stück', 250),
        package_options: [{ count: 3, package_name: 'Packung', weight_g: 250 }],
        package_surplus_g: 50,
      }),
    );
    expect(screen.getByText(/2,8 Stück \(700 g\)/)).toBeInTheDocument();
    expect(screen.getByText(/3 × 250-g-Packung/)).toBeInTheDocument();
  });

  it('saves an amount entered in the start unit as grams', () => {
    const onUpdateQuantity = vi.fn();
    renderRow(item({ name: 'Brötchen', ingredient_id: 9, quantity_g: 1440, start_unit: startUnit('Stück', 60) }), onUpdateQuantity);

    fireEvent.click(screen.getByRole('button', { name: 'Menge von „Brötchen“ ändern' }));
    const input = screen.getByLabelText('Menge');
    fireEvent.change(input, { target: { value: '30' } });
    fireEvent.blur(input);

    expect(onUpdateQuantity).toHaveBeenCalledWith(1, 1800);
  });

  it('offers no amount editing without edit permission or a known unit', () => {
    const { unmount } = render(
      withProviders(
        <ShoppingListItemRow
          item={item({ ingredient_id: 7, start_unit: startUnit('TL', 5) })}
          canEdit={false}
          onCheck={vi.fn()}
          onUpdateQuantity={vi.fn()}
        />,
      ),
    );
    expect(screen.queryByRole('button', { name: /Menge von/ })).toBeNull();
    unmount();
    renderRow(item(), vi.fn());
    expect(screen.queryByRole('button', { name: /Menge von/ })).toBeNull();
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

  it('shows the package need after the amount and a reserve line', () => {
    renderRow(
      item({
        quantity_g: 700,
        package_options: [{ count: 3, package_name: 'Packung', weight_g: 250 }],
        package_surplus_g: 50,
      }),
    );
    expect(screen.getByText('700 g · 3 × 250-g-Packung')).toBeInTheDocument();
    expect(screen.getByText('+ 50 g Reserve')).toBeInTheDocument();
  });

  it('shows no reserve line when rounded down within the tolerance', () => {
    renderRow(
      item({
        quantity_g: 1020,
        package_options: [{ count: 2, package_name: 'Packung', weight_g: 500 }],
        package_surplus_g: -20,
      }),
    );
    expect(screen.getByText('1,0 kg · 2 × 500-g-Packung')).toBeInTheDocument();
    expect(screen.queryByText(/Reserve/)).toBeNull();
  });

  it('shows liquids in litres from the display quantity', () => {
    renderRow(item({ name: 'Milch', quantity_g: 9400, quantity: 9126, unit: 'ml' }));
    expect(screen.getByText('9,1 l')).toBeInTheDocument();
  });

  describe('deleting manual entries', () => {
    it('offers delete for a manual entry (no sources) and reports the item', () => {
      const onDelete = vi.fn();
      const manual = item({ name: 'ZZ-TEST Klebeband', quantity_g: 0, estimated_price_eur: null, can_delete: true });
      render(
        <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
          <ShoppingListItemRow item={manual} canEdit onCheck={vi.fn()} onDelete={onDelete} />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByRole('button', { name: 'Eintrag „ZZ-TEST Klebeband“ löschen' }));

      expect(onDelete).toHaveBeenCalledWith(manual);
    });

    it('offers no delete when the backend withholds it (guest, foreign entry)', () => {
      render(
        <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
          <ShoppingListItemRow item={item({ can_delete: false })} canEdit onCheck={vi.fn()} onDelete={vi.fn()} />
        </MemoryRouter>,
      );

      expect(screen.queryByRole('button', { name: /löschen/ })).not.toBeInTheDocument();
    });

    it('offers no delete for entries generated from a recipe', () => {
      const generated = item({
        sources: [{ recipe_id: 4, recipe_name: 'Chili', recipe_slug: 'chili', meal_label: '', quantity_g: 320 }],
      });
      render(
        <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
          <ShoppingListItemRow item={generated} canEdit onCheck={vi.fn()} onDelete={vi.fn()} />
        </MemoryRouter>,
      );

      expect(screen.queryByRole('button', { name: /löschen/ })).toBeNull();
    });

    it('offers no delete without edit permission', () => {
      render(
        <MemoryRouter future={ROUTER_FUTURE_FLAGS}>
          <ShoppingListItemRow item={item()} canEdit={false} onCheck={vi.fn()} onDelete={vi.fn()} />
        </MemoryRouter>,
      );

      expect(screen.queryByRole('button', { name: /löschen/ })).toBeNull();
    });
  });

  describe('attribution', () => {
    it('shows who added and who checked the entry', () => {
      renderRow(
        item({
          is_checked: true,
          added_by_display_name: 'Anna',
          created_at: '2020-03-01T08:05:00Z',
          checked_by_display_name: 'Ben',
          checked_at: '2020-03-01T09:30:00Z',
        }),
      );

      const text = screen.getByTestId('shopping-item-1-attribution').textContent ?? '';
      expect(text).toContain('Hinzugefügt von Anna');
      expect(text).toContain('Abgehakt von Ben');
    });

    it('shows nothing for generated entries nobody touched', () => {
      renderRow(item());
      expect(screen.queryByTestId('shopping-item-1-attribution')).not.toBeInTheDocument();
    });
  });

  describe('claiming ("Ich hole das")', () => {
    const renderClaim = (i: ShoppingListItem, onClaim = vi.fn()) => {
      render(withProviders(<ShoppingListItemRow item={i} canEdit onCheck={vi.fn()} onClaim={onClaim} />));
      return onClaim;
    };

    it('takes over a free entry', () => {
      const onClaim = renderClaim(item());
      fireEvent.click(screen.getByRole('button', { name: 'Ich hole das' }));
      expect(onClaim).toHaveBeenCalledWith(1, true);
    });

    it('lets me release my own claim', () => {
      const onClaim = renderClaim(item({ claimed_by_display_name: 'Anna', claimed_by_me: true }));
      fireEvent.click(screen.getByRole('button', { name: /Freigeben/ }));
      expect(onClaim).toHaveBeenCalledWith(1, false);
    });

    it('shows who else takes it without an action', () => {
      renderClaim(item({ claimed_by_display_name: 'Ben' }));
      expect(screen.getByText('Ben holt das')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Ich hole das' })).not.toBeInTheDocument();
    });
  });
});
