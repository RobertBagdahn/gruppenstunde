import { describe, expect, it } from 'vitest';
import { MAIN_NAV, isNavItemActive } from './nav-items';

const byKey = (key: string) => MAIN_NAV.find((item) => item.key === key)!;

describe('main navigation (food-frontend-app)', () => {
  it('has exactly the four sections, in order', () => {
    expect(MAIN_NAV.map((item) => item.label)).toEqual(['Rezepte', 'Essenspläne', 'Einkaufslisten', 'Zutaten']);
  });

  it('uses the short labels of the phone bottom bar', () => {
    expect(MAIN_NAV.map((item) => item.shortLabel)).toEqual(['Rezepte', 'Pläne', 'Einkauf', 'Zutaten']);
  });

  it('links Essenspläne to the plan list and Einkaufslisten to the shopping lists', () => {
    expect(byKey('meal-plans').to).toBe('/meal-plans/app');
    expect(byKey('shopping').to).toBe('/shopping-lists');
  });

  it('marks Material as part of the Zutaten area', () => {
    const zutaten = byKey('ingredients');
    expect(isNavItemActive(zutaten, '/ingredients')).toBe(true);
    expect(isNavItemActive(zutaten, '/material')).toBe(true);
    expect(isNavItemActive(zutaten, '/material/schneebesen')).toBe(true);
    expect(isNavItemActive(byKey('recipes'), '/material')).toBe(false);
  });

  it('matches whole path segments only', () => {
    expect(isNavItemActive(byKey('recipes'), '/recipes/chili-sin-carne')).toBe(true);
    expect(isNavItemActive(byKey('recipes'), '/recipesx')).toBe(false);
  });

  it('keeps the old meal-events redirect in the plan area', () => {
    expect(isNavItemActive(byKey('meal-plans'), '/meal-events/3')).toBe(true);
  });
});

describe('pages with a bottom action bar (food-page-shell)', () => {
  it('uses the action bar on the recipe detail and the flows', async () => {
    const { pageUsesActionBar } = await import('./nav-items');
    expect(pageUsesActionBar('/recipes/chili-sin-carne')).toBe(true);
    expect(pageUsesActionBar('/recipes/new')).toBe(true);
    expect(pageUsesActionBar('/recipes/chili-sin-carne/edit')).toBe(true);
    expect(pageUsesActionBar('/meal-plans/new')).toBe(true);
  });

  it('keeps the bottom navigation on lists and the own-recipe pages', async () => {
    const { pageUsesActionBar } = await import('./nav-items');
    expect(pageUsesActionBar('/recipes')).toBe(false);
    expect(pageUsesActionBar('/recipes/my-recipes')).toBe(false);
    expect(pageUsesActionBar('/recipes/folders')).toBe(false);
    expect(pageUsesActionBar('/meal-plans/app')).toBe(false);
  });
});
