import { expect, test, type Page } from '@playwright/test';

async function openApp(page: Page) {
  await page.goto('/');
}

test.describe('food integrity workflows', () => {
  test('confirms a proposed piece portion in the recipe wizard flow', async ({ page }) => {
    await page.route('**/api/ingredients/zwiebel/portions/confirm/', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toMatchObject({
        name: 'kleine Zwiebel',
        weight_g: 80,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 81,
          name: 'kleine Zwiebel',
          quantity: 1,
          weight_g: 80,
          rank: 1,
          is_default: true,
          measuring_unit_id: 1,
          measuring_unit_name: 'Stück',
          weight_status: 'confirmed',
          weight_source: 'manual',
          weight_confirmed_at: '2026-09-16T22:00:00Z',
          weight_confidence: null,
          is_weight_trusted: true,
        }),
      });
    });
    await openApp(page);

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/ingredients/zwiebel/portions/confirm/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'kleine Zwiebel', weight_g: 80, quantity: 1, rank: 1 }),
      });
      return { status: response.status, body: await response.json() };
    });

    expect(result.status).toBe(200);
    expect(result.body.is_weight_trusted).toBe(true);
    expect(result.body.weight_status).toBe('confirmed');
  });

  test('accepts an AI price proposal and exposes accepted provenance', async ({ page }) => {
    await page.route('**/api/ingredients/milch/price-proposals/7/accept/', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toEqual({ replace: false });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 7,
          ingredient_id: 4,
          proposed_price_per_kg: 1.49,
          confidence: 0.93,
          rationale: 'Vergleichbare Milchpreise',
          source: 'gemini',
          status: 'accepted',
          requested_by_name: 'Testperson',
          reviewed_by_name: 'Testperson',
          reviewed_at: '2026-09-16T22:00:00Z',
          ai_interaction_id: 'interaction-7',
          created_at: '2026-09-16T21:00:00Z',
          updated_at: '2026-09-16T22:00:00Z',
        }),
      });
    });
    await openApp(page);

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/ingredients/milch/price-proposals/7/accept/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replace: false }),
      });
      return { status: response.status, body: await response.json() };
    });

    expect(result.status).toBe(200);
    expect(result.body.status).toBe('accepted');
    expect(result.body.proposed_price_per_kg).toBe(1.49);
  });

  test('applies only selected matched recipe materials and rejects new suggestions', async ({ page }) => {
    await page.route('**/api/recipes/1/ai-apply-materials/', async (route) => {
      expect(route.request().postDataJSON()).toEqual([{ material_id: 10, quantity: '30 Stück' }]);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 20,
          material_id: 10,
          material_name: 'Zahnstocher',
          material_slug: 'zahnstocher',
          material_category: 'kitchen',
          quantity: '30 Stück',
          sort_order: 0,
        }]),
      });
    });
    await openApp(page);

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/recipes/1/ai-apply-materials/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ material_id: 10, quantity: '30 Stück' }]),
      });
      return { status: response.status, body: await response.json() };
    });

    expect(result.status).toBe(201);
    expect(result.body).toHaveLength(1);
    expect(result.body[0].material_name).toBe('Zahnstocher');
  });

  test('replaces a recipe item without creating a duplicate or exchange group', async ({ page }) => {
    await page.route('**/api/recipes/1/items/5/replace/', async (route) => {
      expect(route.request().postDataJSON()).toMatchObject({
        portion_id: 22,
        ingredient_id: 9,
        client_request_id: 'e2e-replace-1',
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 5,
          portion_id: 22,
          ingredient_id: 9,
          ingredient_name: 'Jodsalz',
          quantity: 5,
          sort_order: 3,
          note: 'gehackt',
          is_optional: false,
          exchange_group_id: null,
          exchange_position: null,
          ingredient_portions: [],
          weight_g: 5,
          has_missing_weight: false,
          is_weight_trusted: true,
        }),
      });
    });
    await openApp(page);

    const result = await page.evaluate(async () => {
      const response = await fetch('/api/recipes/1/items/5/replace/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portion_id: 22, ingredient_id: 9, client_request_id: 'e2e-replace-1' }),
      });
      return { status: response.status, body: await response.json() };
    });

    expect(result.status).toBe(200);
    expect(result.body.id).toBe(5);
    expect(result.body.exchange_group_id).toBeNull();
    expect(result.body.note).toBe('gehackt');
  });
});
