import { expect, test, type Page, type Route } from '@playwright/test';

// Stateful mock of one shopping list: checks and additions survive reloads, like the real API.
interface MockItem {
  id: number;
  name: string;
  is_checked: boolean;
  retail_section_name: string;
  sort_order: number;
}

const LIST_ID = 3;

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

function toApiItem(item: MockItem) {
  return {
    id: item.id,
    name: item.name,
    quantity_g: 0,
    quantity: 0,
    unit: 'Stück',
    retail_section_name: item.retail_section_name,
    is_checked: item.is_checked,
    checked_by_display_name: item.is_checked ? 'Food Test' : null,
    added_by_display_name: 'Food Test',
    created_at: '2026-10-17T10:00:00Z',
    sort_order: item.sort_order,
    can_delete: true,
    note: '',
  };
}

const DEFAULT_ITEMS: MockItem[] = [
  { id: 1, name: 'Möhren', is_checked: false, retail_section_name: 'Obst und Gemüse', sort_order: 1 },
  { id: 2, name: 'Brötchen', is_checked: false, retail_section_name: 'Backwaren', sort_order: 2 },
  { id: 3, name: 'Milch', is_checked: false, retail_section_name: 'Kühlregal', sort_order: 3 },
];

interface MockOptions {
  items?: MockItem[];
  /** Viewers (`can_edit: false`) may search but not add entries. */
  canEdit?: boolean;
  /** Answer every new entry with a server error. */
  failAdds?: boolean;
}

async function installShoppingMock(page: Page, options: MockOptions = {}): Promise<void> {
  const canEdit = options.canEdit ?? true;
  const state = {
    stamp: 'stamp-1',
    nextId: 4,
    items: (options.items ?? DEFAULT_ITEMS).map((item) => ({ ...item })),
  };
  const bump = () => {
    state.stamp = `stamp-${Date.now()}`;
  };

  await page.route('**/api/auth/me/**', (route) =>
    fulfillJson(route, {
      is_authenticated: true,
      user: {
        id: 1,
        email: 'food-e2e@example.test',
        first_name: 'Food',
        last_name: 'Test',
        display_name: 'Food Test',
        is_staff: false,
        is_superuser: false,
        needs_onboarding: false,
        providers: [],
      },
    }),
  );
  await page.route('**/api/kitchen-reminders/**', (route) => fulfillJson(route, []));
  await page.route('**/api/tags/**', (route) => fulfillJson(route, []));

  // Playwright tries the most recently registered route first, so the general one goes first.
  await page.route(`**/api/shopping-lists/${LIST_ID}/`, (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return fulfillJson(route, {
      id: LIST_ID,
      name: 'Lagereinkauf',
      owner_id: 1,
      owner_display_name: 'Food Test',
      source_type: 'manual',
      created_at: '2026-10-17T09:00:00Z',
      updated_at: '2026-10-17T09:00:00Z',
      can_edit: canEdit,
      can_delete: canEdit,
      is_owner: canEdit,
      can_manage: false,
      share_token: null,
      stamp: state.stamp,
      collaborators: [],
      guests: [],
      viewer_guest_id: null,
      items: state.items.map(toApiItem),
    });
  });
  await page.route(`**/api/shopping-lists/${LIST_ID}/pulse/`, (route) =>
    fulfillJson(route, { stamp: state.stamp }),
  );
  await page.route(`**/api/shopping-lists/${LIST_ID}/items/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      if (options.failAdds) return fulfillJson(route, { detail: 'Serverfehler' }, 500);
      const body = request.postDataJSON() as { name: string };
      const created: MockItem = {
        id: state.nextId++,
        name: body.name,
        is_checked: false,
        retail_section_name: '',
        sort_order: 99,
      };
      state.items.push(created);
      bump();
      return fulfillJson(route, toApiItem(created));
    }
    if (request.method() === 'PATCH') {
      const itemId = Number(new URL(request.url()).pathname.split('/').filter(Boolean).pop());
      const body = request.postDataJSON() as { is_checked?: boolean };
      const item = state.items.find((candidate) => candidate.id === itemId);
      if (!item) return fulfillJson(route, { detail: 'Not Found' }, 404);
      if (typeof body.is_checked === 'boolean') item.is_checked = body.is_checked;
      bump();
      return fulfillJson(route, toApiItem(item));
    }
    return route.fallback();
  });
}

test.describe('shopping list search', () => {
  test('filters, keeps checks across reloads and adds a missing entry from the search', async ({ page }) => {
    await installShoppingMock(page);
    await page.goto(`/shopping-lists/${LIST_ID}`);

    const search = page.getByTestId('shopping-search-input');
    await expect(search).toBeVisible();

    await search.fill('mohr');
    await expect(page.getByTestId('shopping-search-count')).toHaveText('1 Treffer');
    await expect(page.getByTestId('shopping-item-1')).toBeVisible();
    await expect(page.getByTestId('shopping-item-2')).toHaveCount(0);
    await expect(page).toHaveURL(/[?&]q=mohr/);

    await page
      .getByTestId('shopping-item-1')
      .getByRole('button', { name: 'Als erledigt markieren' })
      .click();
    await expect(
      page.getByTestId('shopping-item-1').getByRole('button', { name: 'Als unerledigt markieren' }),
    ).toBeVisible();

    await page.reload();
    await expect(search).toHaveValue('mohr');
    await expect(page.getByTestId('shopping-item-2')).toHaveCount(0);
    await expect(
      page.getByTestId('shopping-item-1').getByRole('button', { name: 'Als unerledigt markieren' }),
    ).toBeVisible();

    await search.fill('senf');
    await expect(page.getByTestId('shopping-search-empty')).toContainText('Nichts gefunden für „senf“');
    await page.getByTestId('shopping-search-add').click();

    await expect(page.getByTestId('shopping-item-4')).toBeVisible();
    await expect(search).toHaveValue('senf');
    await expect(page.getByTestId('shopping-search-count')).toHaveText('1 Treffer');
  });

  test('clears the search with the button and shows every entry again', async ({ page }) => {
    await installShoppingMock(page);
    await page.goto(`/shopping-lists/${LIST_ID}?q=brot`);

    await expect(page.getByTestId('shopping-item-2')).toBeVisible();
    await expect(page.getByTestId('shopping-item-1')).toHaveCount(0);

    await page.getByTestId('shopping-search-clear').click();

    await expect(page.getByTestId('shopping-search-input')).toHaveValue('');
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(page.getByTestId('shopping-item-1')).toBeVisible();
    await expect(page.getByTestId('shopping-item-3')).toBeVisible();
  });

  test('escape clears the term and the count disappears', async ({ page }) => {
    await installShoppingMock(page);
    await page.goto(`/shopping-lists/${LIST_ID}`);

    const search = page.getByTestId('shopping-search-input');
    await search.fill('milch');
    await expect(page.getByTestId('shopping-search-count')).toHaveText('1 Treffer');

    await search.press('Escape');

    await expect(search).toHaveValue('');
    await expect(page.getByTestId('shopping-search-count')).toHaveCount(0);
    await expect(page.getByTestId('shopping-item-1')).toBeVisible();
  });

  test('a viewer can search but only sees the hint, never the add button', async ({ page }) => {
    await installShoppingMock(page, { canEdit: false });
    await page.goto(`/shopping-lists/${LIST_ID}`);

    await page.getByTestId('shopping-search-input').fill('senf');

    await expect(page.getByTestId('shopping-search-empty')).toContainText('Nichts gefunden für „senf“');
    await expect(page.getByTestId('shopping-search-add')).toHaveCount(0);
  });

  test('hides the search for a list without entries', async ({ page }) => {
    await installShoppingMock(page, { items: [] });
    await page.goto(`/shopping-lists/${LIST_ID}`);

    await expect(page.getByText('Diese Liste ist noch leer. Füge Einträge hinzu.')).toBeVisible();
    await expect(page.getByTestId('shopping-search-input')).toHaveCount(0);
  });

  test('a failed add keeps the term and tells the user', async ({ page }) => {
    await installShoppingMock(page, { failAdds: true });
    await page.goto(`/shopping-lists/${LIST_ID}`);

    const search = page.getByTestId('shopping-search-input');
    await search.fill('senf');
    await page.getByTestId('shopping-search-add').click();

    await expect(page.getByText('Eintrag konnte nicht hinzugefügt werden')).toBeVisible();
    await expect(search).toHaveValue('senf');
    await expect(page.getByTestId('shopping-search-empty')).toBeVisible();
  });

  test('typing does not add browser history entries', async ({ page }) => {
    await installShoppingMock(page);
    await page.goto(`/shopping-lists/${LIST_ID}`);

    const search = page.getByTestId('shopping-search-input');
    const historyBefore = await page.evaluate(() => window.history.length);
    await search.pressSequentially('milch', { delay: 20 });

    await expect(page).toHaveURL(/[?&]q=milch/);
    expect(await page.evaluate(() => window.history.length)).toBe(historyBefore);
  });

  test('uses 16px text so iOS does not zoom into the field', async ({ page }) => {
    await installShoppingMock(page);
    await page.goto(`/shopping-lists/${LIST_ID}`);

    const search = page.getByTestId('shopping-search-input');
    await expect(search).toHaveCSS('font-size', '16px');
    await page.getByTestId('shopping-shop-mode-toggle').click();
    await expect(search).toHaveCSS('font-size', '16px');
  });

  test('fits a 320px screen in normal and shopping mode with large tap targets', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await installShoppingMock(page);
    await page.goto(`/shopping-lists/${LIST_ID}`);

    const search = page.getByTestId('shopping-search-input');
    await expect(search).toBeVisible();
    const overflowPx = () =>
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(await overflowPx()).toBeLessThanOrEqual(0);
    expect((await search.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.getByTestId('shopping-shop-mode-toggle').click();

    await expect(search).toHaveClass(/h-12/);
    expect(await overflowPx()).toBeLessThanOrEqual(0);
    // The field and the checkbox animate (transition-all); wait for the settled size instead of the first frame.
    const checkboxLocator = page
      .getByTestId('shopping-item-1')
      .getByRole('button', { name: 'Als erledigt markieren' });
    await expect.poll(async () => (await search.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(48);
    await expect.poll(async () => (await checkboxLocator.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(56);
    await expect.poll(async () => (await checkboxLocator.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(56);
  });
});

test.describe('session check under load', () => {
  // Playwright gives the newest route the first chance, so these overrides sit on top of the shared mock.
  const sessionAnswer = (route: Route) =>
    fulfillJson(route, {
      is_authenticated: true,
      user: {
        id: 1, email: 'food-e2e@example.test', first_name: 'Food', last_name: 'Test', display_name: 'Food Test',
        is_staff: false, is_superuser: false, needs_onboarding: false, providers: [],
      },
    });
  const overloaded = (route: Route) =>
    fulfillJson(route, { detail: 'Zu viele Anfragen', retry_after_seconds: 1 }, 429);

  test('a short overload on the session check does not log the user out', async ({ page }) => {
    test.setTimeout(30_000);
    await installShoppingMock(page);
    let sessionCalls = 0;
    await page.route('**/api/auth/me/**', (route) => {
      sessionCalls += 1;
      return sessionCalls <= 2 ? overloaded(route) : sessionAnswer(route);
    });

    await page.goto(`/shopping-lists/${LIST_ID}`);

    await expect(page.getByTestId('shopping-search-input')).toBeVisible({ timeout: 15_000 });
    // The list may render while the session check is still retrying, so wait for the retries to finish.
    await expect.poll(() => sessionCalls, { timeout: 15_000 }).toBeGreaterThanOrEqual(3);
    await expect(page.getByText('Melde dich an, um diese Einkaufsliste zu sehen.')).toHaveCount(0);
  });

  test('a lasting overload shows a retry instead of the login hint', async ({ page }) => {
    test.setTimeout(30_000);
    await installShoppingMock(page);
    let overloadActive = true;
    await page.route('**/api/auth/me/**', (route) => (overloadActive ? overloaded(route) : sessionAnswer(route)));

    await page.goto(`/shopping-lists/${LIST_ID}`);

    await expect(page.getByText('Anmeldung gerade nicht prüfbar')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('Melde dich an, um diese Einkaufsliste zu sehen.')).toHaveCount(0);

    overloadActive = false;
    await page.getByRole('button', { name: 'Erneut versuchen' }).click();
    await expect(page.getByTestId('shopping-search-input')).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('export to check off', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('copies the open entries as a checklist grouped by section', async ({ page }) => {
    await installShoppingMock(page);
    await page.goto(`/shopping-lists/${LIST_ID}`);

    await page.getByRole('button', { name: 'Liste exportieren' }).click();
    await page.getByRole('menuitem', { name: 'Text kopieren' }).click();

    await expect(page.getByText('Liste kopiert')).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text.split('\n')[0]).toBe('Einkaufsliste: Lagereinkauf');
    expect(text).toContain('*Obst und Gemüse*');
    expect(text).toContain('☐ Möhren');
    expect(text).toContain('☐ Brötchen');
    expect(text).toContain('☐ Milch');
  });

  test('prints a sheet of the open entries and hides the screen while printing', async ({ page }) => {
    await installShoppingMock(page);
    await page.goto(`/shopping-lists/${LIST_ID}`);
    await page.evaluate(() => {
      const w = window as unknown as { __printedSheet: string | null; print: () => void };
      w.__printedSheet = null;
      w.print = () => {
        w.__printedSheet = document.querySelector('[data-testid="shopping-print-view"]')?.textContent ?? null;
      };
    });

    await page.getByRole('button', { name: 'Liste exportieren' }).click();
    await page.getByRole('menuitem', { name: 'Drucken oder als PDF speichern' }).click();

    const printed = await page.evaluate(() => (window as unknown as { __printedSheet: string | null }).__printedSheet);
    expect(printed).toContain('Lagereinkauf');
    expect(printed).toContain('Möhren');
    await expect(page.getByTestId('shopping-print-view')).toHaveCount(0);

    await page.emulateMedia({ media: 'print' });
    await expect(page.getByTestId('shopping-search-input')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Liste exportieren' })).toBeHidden();
  });

  test('shares the text where the browser can share', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: (data: unknown) => {
          (window as unknown as { __shared: unknown }).__shared = data;
          return Promise.resolve();
        },
      });
    });
    await installShoppingMock(page);
    await page.goto(`/shopping-lists/${LIST_ID}`);

    await page.getByRole('button', { name: 'Liste exportieren' }).click();
    await page.getByRole('menuitem', { name: 'Als Text teilen' }).click();

    const shared = await page.evaluate(() => (window as unknown as { __shared: { title: string; text: string } }).__shared);
    expect(shared.title).toBe('Lagereinkauf');
    expect(shared.text).toContain('Einkaufsliste: Lagereinkauf');
  });

  test('leaves out sharing where the browser cannot share', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    });
    await installShoppingMock(page);
    await page.goto(`/shopping-lists/${LIST_ID}`);

    await page.getByRole('button', { name: 'Liste exportieren' }).click();

    await expect(page.getByRole('menuitem', { name: 'Text kopieren' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Als Text teilen' })).toHaveCount(0);
  });

  test('is disabled when every entry is checked', async ({ page }) => {
    await installShoppingMock(page, {
      items: DEFAULT_ITEMS.map((item) => ({ ...item, is_checked: true })),
    });
    await page.goto(`/shopping-lists/${LIST_ID}`);

    await expect(page.getByRole('button', { name: 'Liste exportieren' })).toBeDisabled();
  });
});
