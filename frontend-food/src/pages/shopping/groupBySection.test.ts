import { describe, expect, it } from 'vitest';
import type { ShoppingListItem } from '@/schemas/shoppingList';
import { groupBySection } from '@/lib/shoppingListSections';

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

  it('puts consumable materials in their own last section', () => {
    const groups = groupBySection([
      item(1, 'Pappteller', '', { is_material: true }),
      item(2, '2 kg Zimt', ''),
      item(3, 'Bananen', 'Obst'),
    ]);

    expect(Object.keys(groups)).toEqual(['Obst', 'Sonstiges', 'Verbrauchsmaterial']);
    expect(groups.Verbrauchsmaterial.map((entry) => entry.name)).toEqual(['Pappteller']);
  });

  it('keeps a material section even when the material has a retail section', () => {
    const groups = groupBySection([item(1, 'Servietten', 'Haushalt', { is_material: true })]);

    expect(Object.keys(groups)).toEqual(['Verbrauchsmaterial']);
  });
});
