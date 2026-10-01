import { describe, expect, it } from 'vitest';
import type { ShoppingListItem } from '@/schemas/shoppingList';
import { groupBySection } from './ShoppingListDetailPage';

function item(id: number, name: string, section: string, extra: Partial<ShoppingListItem> = {}): ShoppingListItem {
  return {
    id,
    name,
    retail_section_name: section,
    is_checked: false,
    sort_order: id,
    ...extra,
  } as ShoppingListItem;
}

describe('groupBySection', () => {
  it('lists free-text entries under "Sonstiges" after all sections', () => {
    const groups = groupBySection([
      item(1, '2 kg Zimt', ''),
      item(2, 'Bananen', 'Obst'),
      item(3, 'Möhre', 'Gemüse'),
    ]);

    expect(Object.keys(groups)).toEqual(['Obst', 'Gemüse', 'Sonstiges']);
    expect(groups.Sonstiges.map((entry) => entry.name)).toEqual(['2 kg Zimt']);
  });

  it('merges free text into an existing "Sonstiges" section', () => {
    const groups = groupBySection([item(1, 'Toastbrot', 'Sonstiges'), item(2, 'Grillkohle', '')]);

    expect(Object.keys(groups)).toEqual(['Sonstiges']);
    expect(groups.Sonstiges).toHaveLength(2);
  });

  it('moves checked entries to the end of their section', () => {
    const groups = groupBySection([
      item(1, 'Äpfel', 'Obst', { is_checked: true }),
      item(2, 'Bananen', 'Obst'),
    ]);

    expect(groups.Obst.map((entry) => entry.name)).toEqual(['Bananen', 'Äpfel']);
  });
});
