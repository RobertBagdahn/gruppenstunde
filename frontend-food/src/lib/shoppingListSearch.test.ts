import { describe, it, expect } from 'vitest';
import { ShoppingListItemSchema, type ShoppingListItem } from '@/schemas/shoppingList';
import { filterShoppingItems, normalizeSearchText } from './shoppingListSearch';

function item(id: number, name: string, is_checked = false): ShoppingListItem {
  return ShoppingListItemSchema.parse({ id, name, quantity_g: 0, is_checked, sort_order: id });
}

const names = (items: ShoppingListItem[]) => items.map((i) => i.name);

describe('normalizeSearchText', () => {
  it('ignores case and surrounding whitespace', () => {
    expect(normalizeSearchText('  Milch ')).toBe('milch');
  });

  it('folds umlauts to their base letter and ß to ss', () => {
    expect(normalizeSearchText('Möhren')).toBe('mohren');
    expect(normalizeSearchText('Brötchen')).toBe('brotchen');
    expect(normalizeSearchText('Großpackung')).toBe('grosspackung');
  });

  it('strips accents so é and e compare equal', () => {
    expect(normalizeSearchText('Crème')).toBe(normalizeSearchText('Creme'));
  });
});

describe('filterShoppingItems', () => {
  const items = [item(1, 'Möhren'), item(2, 'Brötchen'), item(3, 'Milch', true), item(4, 'Großpackung Nudeln')];

  it('returns every entry for an empty query', () => {
    expect(filterShoppingItems(items, '')).toBe(items);
    expect(filterShoppingItems(items, '   ')).toBe(items);
  });

  it('finds "Möhren" when typing "mohr"', () => {
    expect(names(filterShoppingItems(items, 'mohr'))).toEqual(['Möhren']);
  });

  it('matches part of a word', () => {
    expect(names(filterShoppingItems(items, 'nudel'))).toEqual(['Großpackung Nudeln']);
  });

  it('matches "ß" with "ss"', () => {
    expect(names(filterShoppingItems(items, 'grosspack'))).toEqual(['Großpackung Nudeln']);
  });

  it('keeps checked entries in the results', () => {
    expect(names(filterShoppingItems(items, 'milch'))).toEqual(['Milch']);
    expect(filterShoppingItems(items, 'milch')[0].is_checked).toBe(true);
  });

  it('returns no entries when nothing matches', () => {
    expect(filterShoppingItems(items, 'senf')).toEqual([]);
  });
});
