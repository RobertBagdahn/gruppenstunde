import { expect, test } from '@playwright/test';

test.describe('recipe PDF export', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/recipes/by-slug/pfannkuchen/**', async (route) => {
      if (route.request().url().includes('/export/pdf/')) {
        await route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-test' });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          slug: 'pfannkuchen',
          title: 'Pfannkuchen',
          summary: '',
          summary_long: '',
          description: '',
          image_url: null,
          execution_time: 'less_30',
          preparation_time: 'none',
          difficulty: 'easy',
          status: 'approved',
          like_score: 0,
          view_count: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          scout_levels: [],
          tags: [],
          can_edit: true,
          can_delete: false,
          recipe_type: 'warm_meal',
          portions: 2,
          equipment: [],
          materials: [],
          recipe_items: [],
          steps: [],
          shared_groups: [],
        }),
      });
    });
  });

  test('passes the selected serving count through the browser URL', async ({ page }) => {
    await page.goto('/recipes/pfannkuchen');
    await page.getByRole('button', { name: /PDF/i }).first().click();
    await expect(page.getByTestId('pdf-servings-input')).toBeVisible();
    await page.getByTestId('pdf-servings-input').fill('4');

    const popupPromise = page.waitForEvent('popup');
    await page.getByRole('button', { name: /PDF öffnen/i }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(/servings=4/);
  });

  test('blocks invalid servings on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/recipes/pfannkuchen');
    await page.getByRole('button', { name: /PDF/i }).first().click();
    await page.getByTestId('pdf-servings-input').fill('101');
    await expect(page.getByTestId('pdf-servings-error')).toBeVisible();
    await expect(page.getByRole('button', { name: /PDF öffnen/i })).toBeDisabled();
  });

  test('surfaces an empty cooking schedule response', async ({ page }) => {
    await page.route('**/api/meal-plans/1/cooking-schedule/export/pdf/**', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Keine Mahlzeiten für Kochplan gefunden' }),
      });
    });

    await page.goto('/');
    const result = await page.evaluate(async () => {
      const response = await fetch('/api/meal-plans/1/cooking-schedule/export/pdf/');
      return { status: response.status, body: await response.json() };
    });
    expect(result.status).toBe(404);
    expect(result.body).toEqual({ detail: 'Keine Mahlzeiten für Kochplan gefunden' });
  });
});
