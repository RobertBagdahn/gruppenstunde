/**
 * The four main sections of the food app (food-frontend-app, food-page-shell).
 * One source for the top bar (desktop) and the bottom bar (phones).
 * The logo leads to the start page; there is no separate "Start" item.
 */

export interface MainNavItem {
  key: 'recipes' | 'meal-plans' | 'shopping' | 'ingredients';
  /** Label from 768 px up. */
  label: string;
  /** Label of the bottom bar below 768 px (food-frontend-app). */
  shortLabel: string;
  /** Lucide-backed icon name (see `components/ui/icon.tsx`). */
  icon: string;
  /** Route prefixes that mark the item as active. */
  activePrefixes: readonly string[];
  /** Where the item links to. */
  to: string;
}

export const MAIN_NAV: readonly MainNavItem[] = [
  {
    key: 'recipes',
    label: 'Rezepte',
    shortLabel: 'Rezepte',
    icon: 'menu_book',
    activePrefixes: ['/recipes'],
    to: '/recipes',
  },
  {
    key: 'meal-plans',
    label: 'Essenspläne',
    shortLabel: 'Pläne',
    icon: 'restaurant_menu',
    activePrefixes: ['/meal-plans', '/meal-events'],
    to: '/meal-plans/app',
  },
  {
    key: 'shopping',
    label: 'Einkaufslisten',
    shortLabel: 'Einkauf',
    icon: 'shopping_cart',
    activePrefixes: ['/shopping-lists'],
    to: '/shopping-lists',
  },
  {
    key: 'ingredients',
    label: 'Zutaten',
    shortLabel: 'Zutaten',
    icon: 'egg',
    // Material is a tab inside the Zutaten area and keeps its own routes.
    activePrefixes: ['/ingredients', '/material', '/material-list'],
    to: '/ingredients',
  },
];

/** Whether a pathname belongs to the item's area (prefix match on whole segments). */
export function isNavItemActive(item: MainNavItem, pathname: string): boolean {
  return item.activePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Pages whose primary action sits in a bottom action bar instead of the bottom navigation
 * (food-page-shell): recipe detail and the flows (recipe and plan wizards, recipe edit).
 */
export function pageUsesActionBar(pathname: string): boolean {
  if (pathname === '/recipes/new' || pathname === '/meal-plans/new') return true;
  if (/^\/recipes\/[^/]+\/edit$/.test(pathname)) return true;
  return /^\/recipes\/[^/]+$/.test(pathname) && !['my-recipes', 'folders'].includes(pathname.split('/')[2] ?? '');
}
