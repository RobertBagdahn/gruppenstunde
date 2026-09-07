import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

type ResourceKind = 'shopping-list' | 'meal-plan' | 'recipe' | 'ingredient' | 'event' | 'content-collaborator';

interface TrackedResource {
  kind: ResourceKind;
  id?: number;
  slug?: string;
}

export class ResourceTracker {
  private readonly resources: TrackedResource[] = [];

  track(resource: TrackedResource): void {
    this.resources.push(resource);
  }

  untrack(kind: ResourceKind, id?: number, slug?: string): void {
    const index = this.resources.findIndex(
      (resource) => resource.kind === kind && resource.id === id && resource.slug === slug,
    );
    if (index >= 0) this.resources.splice(index, 1);
  }

  async cleanup(api: APIRequestContext, csrfToken: string): Promise<void> {
    const failures: string[] = [];

    // Always fetch a fresh CSRF token from the API directly to avoid stale session cookie token issues
    let token = csrfToken;
    try {
      const csrfResp = await api.get('/api/auth/csrf/');
      if (csrfResp.ok()) {
        const body = await csrfResp.json();
        if (body.csrfToken) token = body.csrfToken;
      }
    } catch {
      // fallback to passed csrfToken
    }

    for (const resource of [...this.resources].reverse()) {
      const endpoint = resource.kind === 'ingredient'
        ? `/api/ingredients/${resource.slug ?? ''}/`
        : resource.kind === 'event'
          ? `/api/events/${resource.slug ?? ''}/`
        : resource.kind === 'content-collaborator'
          ? `/api/content-collaborators/${resource.id ?? 0}/`
        : `/api/${resource.kind === 'shopping-list' ? 'shopping-lists' : resource.kind === 'meal-plan' ? 'meal-plans' : 'recipes'}/${resource.id ?? 0}/`;

      try {
        const response = await api.delete(endpoint, {
          headers: { 'X-CSRFToken': token },
        });
        if (!response.ok() && response.status() !== 404) {
          failures.push(`${resource.kind}: ${response.status()} ${endpoint}`);
        }
      } catch (error) {
        failures.push(`${resource.kind}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`E2E resource cleanup failed: ${failures.join('; ')}`);
    }
  }
}

export interface FoodFixtures {
  api: APIRequestContext;
  foodPage: Page;
  resources: ResourceTracker;
  uniqueName: (prefix: string) => string;
}

export interface FoodCredentials {
  email: string;
  password: string;
}

export const defaultFoodCredentials: FoodCredentials = {
  email: process.env.FOOD_E2E_EMAIL ?? 'admin@admin.de',
  password: process.env.FOOD_E2E_PASSWORD ?? 'admin',
};

export async function loginFoodPage(
  page: Page,
  credentials: FoodCredentials = defaultFoodCredentials,
): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('E-Mail-Adresse').fill(credentials.email);
  await page.getByLabel('Passwort').fill(credentials.password);
  await page.getByRole('button', { name: /anmelden/i }).click();
  await page.waitForURL('**/');
  await page.evaluate(() => localStorage.clear());
}

function cookieValue(page: Page, name: string): Promise<string> {
  return page.context().cookies().then((cookies) => {
    // If multiple cookies match (e.g. localhost vs specific domain), take the last or most specific one
    const matching = cookies.filter((cookie) => cookie.name === name);
    return matching.length > 0 ? matching[matching.length - 1].value : '';
  });
}

export const test = base.extend<FoodFixtures>({
  api: async ({ foodPage }, use) => {
    await use(foodPage.request);
  },

  foodPage: async ({ page }, use, testInfo) => {
    await page.addInitScript(() => localStorage.clear());
    await page.routeWebSocket(/\/ws\/shopping-lists\/\d+\/$/, async (webSocket) => {
      await webSocket.close({ code: 1000, reason: 'REST-only E2E test boundary' });
    });
    if (testInfo.project.name !== 'mocked') {
      await loginFoodPage(page);
    }
    await use(page);
  },

  resources: async ({ foodPage }, use) => {
    const resources = new ResourceTracker();
    await use(resources);
    await resources.cleanup(foodPage.request, await cookieValue(foodPage, 'csrftoken'));
  },

  uniqueName: async ({}, use, testInfo) => {
    const suffix = `${testInfo.workerIndex}-${Date.now()}`;
    await use((prefix: string) => `${prefix} ${suffix}`);
  },
});

export { expect };
