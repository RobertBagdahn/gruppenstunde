import { test, expect, type Page } from '@playwright/test';

const MAIN_URL = 'http://localhost:5173';
const FOOD_URL = 'http://localhost:5174';

function collectNonAuthErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Local seed data references media files that may be missing from MEDIA_ROOT.
      const isMissingMedia = text.includes('404') && msg.location().url.includes('/media/');
      if (!text.includes('403') && !text.includes('/api/auth/me/') && !isMissingMedia) {
        errors.push(text);
      }
    }
  });
  return errors;
}

test.describe('Public Pages', () => {
  test('Homepage loads', async ({ page }) => {
    const errors = collectNonAuthErrors(page);

    await page.goto(MAIN_URL);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('Recipe list loads', async ({ page }) => {
    const errors = collectNonAuthErrors(page);

    await page.goto(`${FOOD_URL}/recipes`);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('Search page loads', async ({ page }) => {
    const errors = collectNonAuthErrors(page);

    await page.goto(`${MAIN_URL}/search?q=test`);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('Blog list loads', async ({ page }) => {
    const errors = collectNonAuthErrors(page);

    await page.goto(`${MAIN_URL}/blogs`);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    expect(errors).toHaveLength(0);
  });

  test('Imprint page loads', async ({ page }) => {
    const errors = collectNonAuthErrors(page);

    await page.goto(`${MAIN_URL}/imprint`);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();

    expect(errors).toHaveLength(0);
  });
});
