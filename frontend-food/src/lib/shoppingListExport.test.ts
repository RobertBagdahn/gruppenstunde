import { describe, it, expect } from 'vitest';
import { ShoppingListItemSchema, type ShoppingListItem } from '@/schemas/shoppingList';
import { buildShoppingListExport, formatShoppingListText } from './shoppingListExport';

function item(id: number, name: string, overrides: Record<string, unknown> = {}): ShoppingListItem {
  return ShoppingListItemSchema.parse({
    id,
    name,
    quantity_g: 0,
    unit: 'g',
    is_checked: false,
    sort_order: id,
    ...overrides,
  });
}

// 17.10.2026, 09:05 local time
const NOW = new Date(2026, 9, 17, 9, 5);

describe('buildShoppingListExport', () => {
  it('exports only open entries and counts both sides', () => {
    const items = [
      item(1, 'Möhren', { retail_section_name: 'Obst und Gemüse', quantity_g: 400 }),
      item(2, 'Milch', { retail_section_name: 'Kühlregal', is_checked: true }),
      item(3, 'Brot', { retail_section_name: 'Backwaren' }),
    ];

    const data = buildShoppingListExport('Lager', items, NOW);

    expect(data.openCount).toBe(2);
    expect(data.checkedCount).toBe(1);
    expect(data.sections.flatMap((section) => section.entries.map((entry) => entry.name))).toEqual(['Möhren', 'Brot']);
  });

  it('formats the stamp as "TT.MM.JJJJ, HH:MM Uhr"', () => {
    expect(buildShoppingListExport('Lager', [], NOW).stamp).toBe('17.10.2026, 09:05 Uhr');
  });

  it('keeps retail-section order and puts free text and consumables last', () => {
    const items = [
      item(1, 'Servietten', { is_material: true, retail_section_name: 'Haushalt' }),
      item(2, 'Grillkohle', { retail_section_name: '' }),
      item(3, 'Milch', { retail_section_name: 'Kühlregal' }),
      item(4, 'Möhren', { retail_section_name: 'Obst und Gemüse' }),
    ];

    const titles = buildShoppingListExport('Lager', items, NOW).sections.map((section) => section.title);

    expect(titles).toEqual(['Kühlregal', 'Obst und Gemüse', 'Sonstiges', 'Verbrauchsmaterial']);
  });

  it('leaves out sections that only hold checked entries', () => {
    const items = [
      item(1, 'Milch', { retail_section_name: 'Kühlregal', is_checked: true }),
      item(2, 'Brot', { retail_section_name: 'Backwaren' }),
    ];

    const titles = buildShoppingListExport('Lager', items, NOW).sections.map((section) => section.title);

    expect(titles).toEqual(['Backwaren']);
  });

  it('carries the claimant and leaves out notes, prices and sources', () => {
    const data = buildShoppingListExport(
      'Lager',
      [
        item(1, 'Käse', {
          retail_section_name: 'Kühlregal',
          quantity_g: 400,
          claimed_by_display_name: 'Anna',
          note: 'Bitte Bergkäse',
          estimated_price_eur: 3.4,
          added_by_display_name: 'Ben',
        }),
      ],
      NOW,
    );

    expect(data.sections[0].entries[0]).toEqual({ name: 'Käse', quantity: '400 g', claimedBy: 'Anna' });
    expect(JSON.stringify(data)).not.toContain('Bergkäse');
    expect(JSON.stringify(data)).not.toContain('3.4');
  });
});

describe('formatShoppingListText', () => {
  it('renders the header, bold sections and one checkbox line per entry', () => {
    const data = buildShoppingListExport(
      'Lagereinkauf',
      [
        item(1, 'Möhren', { retail_section_name: 'Obst und Gemüse', quantity_g: 400 }),
        item(2, 'Brot', { retail_section_name: 'Backwaren', claimed_by_display_name: 'Anna' }),
        item(3, 'Milch', { retail_section_name: 'Kühlregal', is_checked: true }),
      ],
      NOW,
    );

    expect(formatShoppingListText(data)).toBe(
      [
        'Einkaufsliste: Lagereinkauf',
        'Stand 17.10.2026, 09:05 Uhr · 2 offen · 1 schon abgehakt',
        '',
        '*Obst und Gemüse*',
        '☐ Möhren – 400 g',
        '',
        '*Backwaren*',
        '☐ Brot (Anna)',
      ].join('\n'),
    );
  });

  it('omits the checked count when nothing is checked yet', () => {
    const data = buildShoppingListExport('Lager', [item(1, 'Brot', { retail_section_name: 'Backwaren' })], NOW);

    expect(formatShoppingListText(data).split('\n')[1]).toBe('Stand 17.10.2026, 09:05 Uhr · 1 offen');
  });

  it('writes only the header when every entry is checked', () => {
    const data = buildShoppingListExport('Lager', [item(1, 'Brot', { is_checked: true })], NOW);

    expect(formatShoppingListText(data)).toBe(
      'Einkaufsliste: Lager\nStand 17.10.2026, 09:05 Uhr · 0 offen · 1 schon abgehakt\n',
    );
  });
});
