import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/shoppingLists', () => ({
  useShoppingListItem: () => ({
    data: {
      id: 7,
      name: 'Milch',
      quantity_g: 500,
      quantity: 500,
      unit: 'g',
      retail_section_name: 'Kühlregal',
      is_checked: false,
      sort_order: 0,
      note: 'laktosefrei',
      sources: [{ recipe_name: 'Porridge', meal_label: 'Frühstück', quantity_g: 500 }],
      package_options: [{ count: 2, package_name: 'Flasche', weight_g: 1000 }],
      portion_options: [],
      claimed_by_me: false,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
import { fireEvent, render, screen } from '@testing-library/react';
import ShoppingBoardView, { formatBoardQuantity, groupBoardItems } from './ShoppingBoardView';
import type { ShoppingBoardItem, ShoppingListBoard } from '@/schemas/shoppingList';

function item(overrides: Partial<ShoppingBoardItem> & { id: number; name: string }): ShoppingBoardItem {
  return {
    quantity: 0,
    unit: 'g',
    retail_section_id: null,
    retail_section_name: '',
    is_material: false,
    is_checked: false,
    checked_by_name: null,
    claimed_by_name: null,
    claimed_by_me: false,
    can_delete: false,
    sort_order: 0,
    note: '',
    ...overrides,
  };
}

function board(items: ShoppingBoardItem[], overrides: Partial<ShoppingListBoard> = {}): ShoppingListBoard {
  return {
    id: 1,
    name: 'Wocheneinkauf',
    stamp: 's',
    can_edit: true,
    viewer_display_name: 'Anna',
    total: items.length,
    checked: items.filter((i) => i.is_checked).length,
    items,
    ...overrides,
  };
}

const handlers = () => ({
  onRetry: vi.fn(),
  onExit: vi.fn(),
  onCheck: vi.fn(),
  onClaim: vi.fn(),
  onDelete: vi.fn(),
});

describe('formatBoardQuantity', () => {
  it('shows kilograms from 1000 g and keeps other units', () => {
    expect(formatBoardQuantity(1500, 'g')).toBe('1,5 kg');
    expect(formatBoardQuantity(250, 'g')).toBe('250 g');
    expect(formatBoardQuantity(2, 'Stück')).toBe('2 Stück');
    expect(formatBoardQuantity(0, 'g')).toBe('');
  });
});

describe('groupBoardItems', () => {
  it('keeps section order, puts open entries first and "Sonstiges"/"Material" last', () => {
    const groups = groupBoardItems([
      item({ id: 1, name: 'Freitext', sort_order: 1 }),
      item({ id: 2, name: 'Mehl', retail_section_name: 'Backwaren', sort_order: 2, is_checked: true }),
      item({ id: 3, name: 'Tüten', is_material: true }),
      item({ id: 4, name: 'Brot', retail_section_name: 'Backwaren', sort_order: 1 }),
      item({ id: 5, name: 'Milch', retail_section_name: 'Kühlregal' }),
    ]);

    expect(groups.map(([section]) => section)).toEqual(['Backwaren', 'Kühlregal', 'Sonstiges', 'Material']);
    expect(groups[0][1].map((i) => i.name)).toEqual(['Brot', 'Mehl']);
  });
});

describe('ShoppingBoardView', () => {
  it('shows progress and toggles an entry through the check handler', () => {
    const h = handlers();
    render(
      <ShoppingBoardView
        board={board([item({ id: 7, name: 'Milch', retail_section_name: 'Kühlregal' })])}
        isLoading={false}
        error={null}
        {...h}
      />,
    );

    expect(screen.getByText('0 von 1 erledigt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Milch als erledigt markieren' }));
    expect(h.onCheck).toHaveBeenCalledWith(7, true);
  });

  it('offers claiming only when nobody has taken the entry', () => {
    const h = handlers();
    render(
      <ShoppingBoardView
        board={board([
          item({ id: 1, name: 'Brot', claimed_by_name: 'Ben' }),
          item({ id: 2, name: 'Mehl' }),
        ])}
        isLoading={false}
        error={null}
        {...h}
      />,
    );

    expect(screen.getByText('Holt: Ben')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Ich hole das' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Ich hole das' }));
    expect(h.onClaim).toHaveBeenCalledWith(2, true);
  });

  it('hides editing for viewers without edit rights', () => {
    render(
      <ShoppingBoardView
        board={board([item({ id: 1, name: 'Brot', can_delete: true })], { can_edit: false })}
        isLoading={false}
        error={null}
        {...handlers()}
      />,
    );

    expect(screen.getByRole('checkbox', { name: 'Brot als erledigt markieren' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Ich hole das' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Brot löschen' })).toBeNull();
  });

  it('exits shopping mode from the header', () => {
    const h = handlers();
    render(<ShoppingBoardView board={board([])} isLoading={false} error={null} {...h} />);

    fireEvent.click(screen.getByRole('button', { name: 'Einkaufsmodus beenden' }));
    expect(h.onExit).toHaveBeenCalled();
  });
});

describe('ShoppingBoardView details', () => {
  it('opens the omitted details of an entry from its eye button', () => {
    render(
      <ShoppingBoardView
        board={board([item({ id: 7, name: 'Milch', retail_section_name: 'Kühlregal' })])}
        isLoading={false}
        error={null}
        {...handlers()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Details zu Milch' }));

    expect(screen.getByText('Herkunft')).toBeInTheDocument();
    expect(screen.getByText('Porridge · Frühstück')).toBeInTheDocument();
    expect(screen.getByText('2 × Flasche (1000 g)')).toBeInTheDocument();
    expect(screen.getByText('laktosefrei')).toBeInTheDocument();
  });
});
