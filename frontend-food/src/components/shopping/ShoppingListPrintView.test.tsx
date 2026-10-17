// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShoppingListItemSchema, type ShoppingListItem } from '@/schemas/shoppingList';
import { buildShoppingListExport } from '@/lib/shoppingListExport';
import ShoppingListPrintView from './ShoppingListPrintView';

function item(id: number, name: string, overrides: Record<string, unknown> = {}): ShoppingListItem {
  return ShoppingListItemSchema.parse({ id, name, quantity_g: 0, unit: 'g', is_checked: false, sort_order: id, ...overrides });
}

const NOW = new Date(2026, 9, 17, 9, 5);

describe('ShoppingListPrintView', () => {
  it('shows the header, sections with a box per entry and the blank lines', () => {
    const data = buildShoppingListExport(
      'Lagereinkauf',
      [
        item(1, 'Möhren', { retail_section_name: 'Obst und Gemüse', quantity_g: 400, claimed_by_display_name: 'Anna' }),
        item(2, 'Brot', { retail_section_name: 'Backwaren' }),
        item(3, 'Milch', { retail_section_name: 'Kühlregal', is_checked: true }),
      ],
      NOW,
    );

    render(<ShoppingListPrintView data={data} />);
    const sheet = screen.getByTestId('shopping-print-view');

    expect(within(sheet).getByRole('heading', { level: 1, name: 'Lagereinkauf' })).toBeInTheDocument();
    expect(sheet).toHaveTextContent('Stand 17.10.2026, 09:05 Uhr · 2 offen · 1 schon abgehakt');
    expect(within(sheet).getByRole('heading', { level: 2, name: 'Obst und Gemüse' })).toBeInTheDocument();
    expect(sheet).toHaveTextContent('Möhren – 400 g (Anna)');
    expect(sheet).toHaveTextContent('Brot');
    expect(sheet).not.toHaveTextContent('Milch');
    expect(within(sheet).getByRole('heading', { level: 2, name: 'Zusätzlich' })).toBeInTheDocument();
  });

  it('leaves five blank lines for extra entries', () => {
    const data = buildShoppingListExport('Lager', [item(1, 'Brot')], NOW);
    const { container } = render(<ShoppingListPrintView data={data} />);

    const blankLines = container.querySelectorAll('section:last-of-type > div.h-6');
    expect(blankLines).toHaveLength(5);
  });

  it('hides itself on screen and only shows when printing', () => {
    const data = buildShoppingListExport('Lager', [item(1, 'Brot')], NOW);
    render(<ShoppingListPrintView data={data} />);

    expect(screen.getByTestId('shopping-print-view')).toHaveClass('hidden', 'print:block');
  });
});
