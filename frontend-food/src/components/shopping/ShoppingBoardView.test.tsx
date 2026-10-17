import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/shoppingLists', () => ({
  useShoppingListItem: () => ({
    data: {
      id: 7,
      name: 'Milch',
      ingredient_id: 3,
      ingredient_slug: 'milch',
      quantity_g: 500,
      quantity: 500,
      unit: 'g',
      retail_section_name: 'Kühlregal',
      is_checked: false,
      sort_order: 0,
      note: 'laktosefrei',
      sources: [
        { recipe_name: 'Porridge', recipe_slug: 'porridge', meal_label: 'Frühstück', quantity_g: 300 },
        { recipe_name: 'Pudding', recipe_slug: '', meal_label: 'Nachtisch', quantity_g: 200 },
      ],
      package_options: [{ count: 2, package_name: 'Flasche', weight_g: 1000 }],
      portion_options: [
        { count: 2, name: 'Becher', weight_g: 250, is_default: true },
        { count: 4, name: 'Tasse', weight_g: 125, is_default: false },
      ],
      start_unit: {
        key: 'portion:Flasche', kind: 'portion', label: 'Flasche', grams_per_unit: 100,
        is_approx: false, has_weight: true, portion_id: 11, measuring_unit_id: null, standard_measure_key: null,
      },
      package_surplus_g: null,
      claimed_by_me: false,
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '@/lib/api';
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
  onUpdateQuantity: vi.fn(),
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
      <MemoryRouter>
        <ShoppingBoardView
          board={board([item({ id: 7, name: 'Milch', retail_section_name: 'Kühlregal' })])}
          isLoading={false}
          error={null}
          {...handlers()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Details zu Milch' }));

    expect(screen.getAllByText('Herkunft')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Porridge' })).toHaveAttribute('href', '/recipes/porridge');
    expect(screen.getByRole('dialog').textContent).toContain('Pudding (Nachtisch)');
    expect(screen.getByRole('dialog').textContent).toContain('2 × 1-kg-Flasche');
    expect(screen.getByText('laktosefrei')).toBeInTheDocument();
  });

  it('lists every portion option, not only the default one, and the amount per source', () => {
    render(
      <MemoryRouter>
        <ShoppingBoardView
          board={board([item({ id: 7, name: 'Milch' })])}
          isLoading={false}
          error={null}
          {...handlers()}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Details zu Milch' }));

    expect(screen.getAllByText('Portion')).toHaveLength(2);
    expect(screen.getByText(/Becher.*\(Standard\)/)).toBeInTheDocument();
    expect(screen.getByText(/Tasse/)).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(dialog.textContent).toContain('Porridge (Frühstück) · 300 g');
    expect(dialog.textContent).toContain('Pudding (Nachtisch) · 200 g');
  });
});


describe('ShoppingBoardView overload', () => {
  const overload = () => new ApiError(429, '', {});

  it('keeps the board and shows a notice when a reload is turned away', () => {
    render(
      <ShoppingBoardView
        board={board([item({ id: 1, name: 'Käse' })])}
        isLoading={false}
        error={overload()}
        {...handlers()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Gerade sind viele gleichzeitig dabei. Wir versuchen es gleich nochmal.');
    expect(screen.getByText('Käse')).toBeInTheDocument();
  });

  it('shows the notice when only the poll is turned away', () => {
    render(
      <ShoppingBoardView
        board={board([item({ id: 1, name: 'Käse' })])}
        isLoading={false}
        error={null}
        overloaded
        {...handlers()}
      />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('still replaces the board by the error page for other errors (e.g. lost access)', () => {
    render(
      <ShoppingBoardView
        board={board([item({ id: 1, name: 'Käse' })])}
        isLoading={false}
        error={new ApiError(404, '', { detail: 'Nicht gefunden' })}
        {...handlers()}
      />,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByText('Käse')).not.toBeInTheDocument();
  });

  it('shows the error page when nothing was loaded yet, even on overload', () => {
    render(<ShoppingBoardView board={undefined} isLoading={false} error={overload()} {...handlers()} />);

    expect(screen.queryByText('Wocheneinkauf')).not.toBeInTheDocument();
  });
});

describe('ShoppingBoardView partial quantity', () => {
  it('opens the quantity dialog with a focused field and saves the new grams', () => {
    const h = handlers();
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter>
          <ShoppingBoardView
            board={board([item({ id: 7, name: 'Milch', retail_section_name: 'Kühlregal' })])}
            isLoading={false}
            error={null}
            {...h}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Menge von „Milch“ ändern' }));
    const input = screen.getByLabelText('Menge');
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.blur(input);

    expect(h.onUpdateQuantity).toHaveBeenCalledWith(7, 200);
  });

  it('offers no quantity change for checked entries or without edit permission', () => {
    const { unmount } = render(
      <ShoppingBoardView
        board={board([item({ id: 1, name: 'Brot', is_checked: true })])}
        isLoading={false}
        error={null}
        {...handlers()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Menge von/ })).toBeNull();
    unmount();
    render(
      <ShoppingBoardView
        board={board([item({ id: 1, name: 'Brot' })], { can_edit: false })}
        isLoading={false}
        error={null}
        {...handlers()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Menge von/ })).toBeNull();
  });
});
