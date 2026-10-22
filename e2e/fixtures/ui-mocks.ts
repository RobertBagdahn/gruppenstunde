/**
 * Mocked API for the UI baselines (food-ui-quality-gates): fixed data, fixed clock, no network.
 * Every answer comes from `fixtures/ui/*.json`, which `frontend-food/src/__tests__/uiFixtures.contract.test.ts`
 * validates against the schemas the app parses them with.
 */
import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

/** The clock of every baseline: 17 Oct 2026, 10:00 in Berlin ("noch 9 Tage" to the autumn camp). */
export const UI_NOW = new Date('2026-10-17T08:00:00Z');

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./ui/${name}.json`, import.meta.url), 'utf-8'));
}

function user(staff: boolean) {
  return {
    is_authenticated: true,
    user: {
      id: 1,
      email: 'e2e@example.test',
      first_name: 'E2E',
      last_name: 'Test',
      display_name: 'E2E Test',
      is_staff: staff,
      is_superuser: false,
      needs_onboarding: false,
      providers: [],
    },
  };
}

export interface UiMockOptions {
  /** Staff users see the admin entry in the profile menu. */
  staff?: boolean;
  /** Answers per exact path, overriding the defaults (used by state variants). */
  overrides?: Record<string, unknown>;
}

export interface UiMock {
  /** API paths that were requested but have no mock (diagnostics for the tests). */
  unmocked: string[];
}

const EMPTY_PAGE = { items: [], total: 0, page: 1, page_size: 20, total_pages: 0 };

export async function mockUiApi(page: Page, options: UiMockOptions = {}): Promise<UiMock> {
  const unmocked: string[] = [];
  const answers: Record<string, unknown> = {
    '/api/auth/me/': user(options.staff ?? false),
    '/api/ai/quota/': fixture('ai-quota'),
    '/api/food/dashboard/': fixture('dashboard'),
    '/api/recipes/': fixture('recipes-page'),
    '/api/recipes/by-slug/chili-sin-carne/': fixture('recipe-detail'),
    '/api/tags/': [],
    '/api/nutritional-tags/': [],
    '/api/retail-sections/': [],
    '/api/supplies/materials/': EMPTY_PAGE,
    '/api/supplies/measuring-units/': [],
    '/api/kitchen-reminders/': [],
    '/api/content/links/': [],
    '/api/content/admin/approvals/': fixture('empty-page'),
    '/api/admin/data-quality/offensive/summary/': fixture('offensive-summary'),
    '/api/ingredient-statistics/rankings/': fixture('rankings'),
    '/api/unit-conversions/available/batch/': fixture('conversion-batch'),
    '/api/recipes/1/rules/': fixture('recipe-rules'),
    '/api/recipes/1/comments/': [],
    '/api/recipes/1/nutri-score/': fixture('recipe-nutri-score'),
    '/api/recipes/1/nutrition-breakdown/': fixture('recipe-nutrition-breakdown'),
    '/api/meal-plans/1/plan-check/': fixture('plan-check'),
    '/api/meal-plans/1/ingredient-scan/': fixture('ingredient-scan'),
    '/api/meal-plans/recipes/recently-used/': fixture('recently-used'),
    '/api/meal-plans/recipes/search/': fixture('unified-search'),
    '/api/ingredients/zwiebel/': fixture('ingredient-detail'),
    '/api/meal-plans/': fixture('meal-plans'),
    '/api/meal-plans/1/': fixture('meal-plan-detail'),
    '/api/shopping-lists/': fixture('shopping-lists-page'),
    '/api/shopping-lists/1/': fixture('shopping-list-detail'),
    '/api/shopping-lists/1/warnings/': fixture('shopping-list-warnings'),
    ...options.overrides,
  };

  // Only paths below /api/ are mocked: a glob like `**/api/**` would also catch Vite's `/src/api/*.ts` modules.
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const { pathname } = new URL(route.request().url());
      const readsViaPost = pathname === '/api/unit-conversions/available/batch/';
      if ((route.request().method() === 'GET' || readsViaPost) && pathname in answers) {
        return route.fulfill({ json: answers[pathname] });
      }
      unmocked.push(`${route.request().method()} ${pathname}`);
      return route.fulfill({ status: 404, json: { detail: 'Not mocked in the UI baselines' } });
    },
  );
  // The shopping list opens a live socket; the baselines are REST-only.
  await page.routeWebSocket(/\/ws\//, (socket) => socket.close({ code: 1000, reason: 'REST-only UI baseline' }));
  return { unmocked };
}
