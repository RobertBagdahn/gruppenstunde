/**
 * Route policy for search engines and social previews (food-seo-markup).
 *
 * One table decides, per route, whether a page may be indexed, which title and
 * description it gets by default, and which canonical URL it points to. Pages with
 * their own data (a recipe, a filtered list) override the title through `usePageMeta`.
 *
 * Order matters: the first matching pattern wins, so specific private routes
 * (`/recipes/new`) come before the dynamic public ones (`/recipes/:slug`).
 */
import { matchPath } from 'react-router-dom';

export type RouteKind = 'public' | 'list' | 'private';

export interface RouteRule {
  /** Pattern exactly as written in `App.tsx` (`path="…"`). */
  pattern: string;
  kind: RouteKind;
  /** Default title part; the site name is appended. `undefined` keeps the start title. */
  title?: string;
  description?: string;
}

export const ROUTE_RULES: readonly RouteRule[] = [
  { pattern: '/', kind: 'public', description: 'Rezepte, Zutaten und Essensplanung für Pfadfinder-Gruppen und Lager.' },
  { pattern: '/privacy', kind: 'public', title: 'Datenschutz', description: 'Datenschutzerklärung der Inspi Food-Anwendung.' },
  { pattern: '/imprint', kind: 'public', title: 'Impressum', description: 'Impressum der Inspi Food-Anwendung.' },
  { pattern: '/login', kind: 'private', title: 'Anmelden', description: 'Anmelden bei Inspi Food.' },
  { pattern: '/register', kind: 'private', title: 'Registrieren', description: 'Konto für Inspi Food anlegen.' },

  // Private and time-bound routes first, so that their paths are not taken by `:slug` patterns.
  { pattern: '/recipes/my-recipes', kind: 'private', title: 'Meine Rezepte', description: 'Deine persönlichen Rezepte.' },
  { pattern: '/recipes/folders', kind: 'private', title: 'Rezept-Ordner', description: 'Deine Ordner für Rezepte.' },
  { pattern: '/recipes/new', kind: 'private', title: 'Neues Rezept', description: 'Ein neues Rezept anlegen.' },
  { pattern: '/recipes/:slug/edit', kind: 'private', title: 'Rezept bearbeiten', description: 'Ein Rezept bearbeiten.' },
  { pattern: '/recipes', kind: 'list', title: 'Rezepte', description: 'Rezepte für Gruppenstunden, Lager und Fahrten – filterbar nach Typ, Aufwand und Nährwerten.' },
  { pattern: '/recipes/:slug', kind: 'public', title: 'Rezept', description: 'Rezept für Gruppenstunden, Lager und Fahrten mit Zutaten, Schritten und Nährwerten.' },

  { pattern: '/ingredients/new', kind: 'private', title: 'Neue Zutat', description: 'Eine neue Zutat anlegen.' },
  { pattern: '/ingredients/statistics/:tab?', kind: 'private', title: 'Zutaten-Statistik', description: 'Auswertungen der Zutatendatenbank.' },
  { pattern: '/ingredients/:slug/edit', kind: 'private', title: 'Zutat bearbeiten', description: 'Eine Zutat bearbeiten.' },
  { pattern: '/ingredients', kind: 'list', title: 'Zutaten', description: 'Zutaten mit Nährwerten, Herkunft und Lagerhinweisen.' },
  { pattern: '/ingredients/:slug', kind: 'public', title: 'Zutat', description: 'Zutat mit Nährwerten, Portionen und Lagerhinweisen.' },

  { pattern: '/material', kind: 'private', title: 'Material', description: 'Material für Gruppenstunden und Lager.' },
  { pattern: '/material-list', kind: 'private', title: 'Materialliste', description: 'Materialliste zum Abhaken.' },
  { pattern: '/material/:slug', kind: 'private', title: 'Material', description: 'Material für Gruppenstunden und Lager.' },

  { pattern: '/meal-plans', kind: 'private', title: 'Essensplanung', description: 'Essenspläne für Lager, Fahrten und Gruppenstunden planen.' },
  { pattern: '/meal-plans/new', kind: 'private', title: 'Neuer Essensplan', description: 'Einen neuen Essensplan anlegen.' },
  { pattern: '/meal-plans/app', kind: 'private', title: 'Essenspläne', description: 'Deine Essenspläne.' },
  { pattern: '/meal-plans/:id/ref-meals/breakfast/wizard', kind: 'private', title: 'Frühstücks-Assistent', description: 'Frühstück für den Essensplan zusammenstellen.' },
  { pattern: '/meal-plans/:id/ref-meals/:mealType', kind: 'private', title: 'Referenz-Mahlzeiten', description: 'Referenz-Mahlzeiten für den Essensplan.' },
  { pattern: '/meal-plans/:id/meals/:mealId/breakfast-wizard', kind: 'private', title: 'Frühstücks-Assistent', description: 'Frühstück für den Essensplan zusammenstellen.' },
  { pattern: '/meal-plans/:id/breakfast/wizard', kind: 'private', title: 'Frühstücks-Assistent', description: 'Frühstück für den Essensplan zusammenstellen.' },
  { pattern: '/meal-plans/:id/*', kind: 'private', title: 'Essensplan', description: 'Ein Essensplan mit Mahlzeiten, Einkauf und Kosten.' },
  { pattern: '/meal-events/*', kind: 'private', title: 'Essensplanung', description: 'Essenspläne für Lager, Fahrten und Gruppenstunden planen.' },

  { pattern: '/shopping-lists', kind: 'private', title: 'Einkaufslisten', description: 'Deine Einkaufslisten.' },
  { pattern: '/shopping-lists/join/:token', kind: 'private', title: 'Einkaufsliste beitreten', description: 'Einer Einkaufsliste beitreten.' },
  { pattern: '/shopping-lists/:id', kind: 'private', title: 'Einkaufsliste', description: 'Eine Einkaufsliste mit Mengen und Abhaken.' },

  { pattern: '/tools/norm-portion-simulator', kind: 'private', title: 'Norm-Portionen-Simulator', description: 'Mengen nach Norm-Portionen berechnen.' },

  { pattern: '/profile', kind: 'private', title: 'Profil', description: 'Dein Profil.' },
  { pattern: '/profile/account', kind: 'private', title: 'Konto', description: 'Dein Konto.' },
  { pattern: '/profile/name/:slug', kind: 'private', title: 'Profil', description: 'Öffentliches Profil.' },

  { pattern: '/styleguide', kind: 'private', title: 'Styleguide', description: 'Gestaltungsregeln von Inspi Food.' },

  { pattern: '/admin', kind: 'private', title: 'Administration', description: 'Verwaltung von Inspi Food.' },
  { pattern: '/admin/tag/:id', kind: 'private', title: 'Schlagwort', description: 'Verwaltung eines Schlagworts.' },
  { pattern: '/admin/data-quality', kind: 'private', title: 'Datenqualität', description: 'Datenqualität der Rezepte und Zutaten.' },
  { pattern: '/admin/data-quality/:section', kind: 'private', title: 'Datenqualität', description: 'Datenqualität der Rezepte und Zutaten.' },
  { pattern: '/admin/:section', kind: 'private', title: 'Administration', description: 'Verwaltung von Inspi Food.' },
  { pattern: '/data-quality/distributions', kind: 'private', title: 'Datenverteilungen', description: 'Verteilungen der Datenbestände.' },

  { pattern: '*', kind: 'private', title: 'Seite nicht gefunden', description: 'Diese Seite gibt es nicht.' },
];

export interface IndexPolicy {
  robots: 'index,follow' | 'noindex,follow' | 'noindex,nofollow';
  /** Path (and `?page=N` for lists) the canonical link points to. */
  canonicalPath: string;
}

export interface RouteMeta extends IndexPolicy {
  kind: RouteKind;
  title?: string;
  description?: string;
}

/** Route rule for a pathname; unknown paths fall back to the catch-all rule. */
export function findRouteRule(pathname: string): RouteRule {
  const rule = ROUTE_RULES.find((candidate) => matchPath({ path: candidate.pattern, end: true }, pathname));
  return rule ?? ROUTE_RULES[ROUTE_RULES.length - 1];
}

/**
 * Lists with search, filter or sort parameters are `noindex,follow` and point to the list
 * without them; only `page` stays in the canonical URL (food-seo-markup).
 */
export function getIndexPolicy(pathname: string, search: string): IndexPolicy {
  const rule = findRouteRule(pathname);
  if (rule.kind === 'private') return { robots: 'noindex,nofollow', canonicalPath: pathname };
  if (rule.kind === 'public') return { robots: 'index,follow', canonicalPath: pathname };

  const params = new URLSearchParams(search);
  const page = params.get('page');
  const canonicalPath = page ? `${pathname}?page=${encodeURIComponent(page)}` : pathname;
  const hasFilters = [...params.keys()].some((key) => key !== 'page' && params.get(key));
  return { robots: hasFilters ? 'noindex,follow' : 'index,follow', canonicalPath };
}

/** Everything a page needs by default for the given location. */
export function getRouteMeta(pathname: string, search: string): RouteMeta {
  const rule = findRouteRule(pathname);
  return { kind: rule.kind, title: rule.title, description: rule.description, ...getIndexPolicy(pathname, search) };
}
