/**
 * Register of the pages the UI baselines cover (food-ui-quality-gates). Every check in
 * `food-ui.ui.spec.ts` runs over this list: screenshot (390 and 1440 px), axe, tap targets, overflow.
 * `route` is the React Router pattern from `frontend-food/src/App.tsx`; `uiRegister.test.ts` fails when a
 * route there is neither registered nor listed with a reason in `UI_REGISTER_EXCLUDED`.
 */
import type { Page } from '@playwright/test';

export interface UiPage {
  /** Snapshot name; unique and URL-safe. */
  id: string;
  title: string;
  /** Router pattern of the page. */
  route: string;
  /** Concrete URL opened by the test. */
  path: string;
  /** Text of the single H1. */
  h1: string | RegExp;
  /** Main pages get screenshots; smoke pages only run axe, overflow and tap-target checks. */
  screenshot: boolean;
  staff?: boolean;
  /** Steps after the page loaded, e.g. opening a view that is no route of its own. */
  prepare?: (page: Page) => Promise<void>;
  /** Documented axe exceptions: a rule is only skipped with a reason. `meta-viewport` never is. */
  axeExceptions?: { rule: string; reason: string }[];
}

export const UI_PAGES: UiPage[] = [
  { id: 'startseite', title: 'Startseite', route: '/', path: '/', h1: 'Was kocht ihr als Nächstes?', screenshot: true },
  { id: 'rezeptuebersicht', title: 'Rezeptübersicht', route: '/recipes', path: '/recipes', h1: 'Rezepte', screenshot: true },
  { id: 'rezeptdetail', title: 'Rezeptdetail', route: '/recipes/:slug', path: '/recipes/chili-sin-carne', h1: 'Chili sin Carne', screenshot: true },
  {
    id: 'kochmodus',
    title: 'Kochmodus',
    route: '/recipes/:slug',
    path: '/recipes/chili-sin-carne',
    // Expected to fail on today's look: the cooking mode has no H1 yet (task 6.6). Kept on purpose as a baseline finding.
    h1: 'Chili sin Carne',
    screenshot: true,
    prepare: async (page) => {
      // Phones keep the action in the overflow menu; wider screens show it directly.
      const start = page.getByRole('button', { name: 'Kochen starten' });
      if ((await start.count()) === 0) await page.getByRole('button', { name: 'Weitere Aktionen' }).click();
      await start.first().click();
    },
  },
  { id: 'rezept-erstellen', title: 'Rezept erstellen', route: '/recipes/new', path: '/recipes/new', h1: 'Neues Rezept', screenshot: true },
  { id: 'essensplaene', title: 'Essenspläne', route: '/meal-plans/app', path: '/meal-plans/app', h1: 'Essenspläne', screenshot: true },
  { id: 'neuer-essensplan', title: 'Neuer Essensplan', route: '/meal-plans/new', path: '/meal-plans/new', h1: 'Essensplan erstellen', screenshot: true },
  { id: 'essensplan', title: 'Essensplan', route: '/meal-plans/:id/*', path: '/meal-plans/1', h1: 'Herbstlager 2026', screenshot: true },
  { id: 'einkaufsliste', title: 'Einkaufsliste', route: '/shopping-lists/:id', path: '/shopping-lists/1', h1: 'Herbstlager 2026', screenshot: true },
  { id: 'zutat-detail', title: 'Zutat-Detail', route: '/ingredients/:slug', path: '/ingredients/zwiebel', h1: 'Zwiebel', screenshot: true },
  // Smoke pages: no screenshots (data-heavy admin views), but axe, overflow and tap-target checks.
  { id: 'smoke-admin', title: 'Administration', route: '/admin', path: '/admin', h1: /.+/, screenshot: false, staff: true },
  { id: 'smoke-datenqualitaet', title: 'Datenqualität', route: '/admin/data-quality', path: '/admin/data-quality', h1: /.+/, screenshot: false, staff: true },
  { id: 'smoke-zutaten-statistik', title: 'Zutaten-Statistik', route: '/ingredients/statistics/:tab?', path: '/ingredients/statistics', h1: /.+/, screenshot: false },
];

/** Routes that exist but are not registered yet. Each entry names the task that adds them. */
export const UI_REGISTER_EXCLUDED: { route: string; reason: string }[] = [];
