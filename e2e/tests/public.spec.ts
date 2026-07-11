import { test, expect } from '@playwright/test';

const MAIN_URL = 'http://localhost:5173';
const FOOD_URL = 'http://localhost:5174';

function collectNonAuthErrors(page: any): string[] {
  const errors: string[] = [];
  page.on('console', (msg: any) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('403') && !text.includes('/api/auth/me/')) {
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
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-viewport.png`, fullPage: false });
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-fullpage.png`, fullPage: true });
  });

  test('Recipe list loads', async ({ page }) => {
    const errors = collectNonAuthErrors(page);

    await page.goto(`${FOOD_URL}/recipes`);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-viewport.png`, fullPage: false });
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-fullpage.png`, fullPage: true });
  });

  test('Search page loads', async ({ page }) => {
    const errors = collectNonAuthErrors(page);

    await page.goto(`${MAIN_URL}/search?q=test`);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-viewport.png`, fullPage: false });
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-fullpage.png`, fullPage: true });
  });

  test('Blog list loads', async ({ page }) => {
    const errors = collectNonAuthErrors(page);

    await page.goto(`${MAIN_URL}/blogs`);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-viewport.png`, fullPage: false });
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-fullpage.png`, fullPage: true });
  });

  test('Imprint page loads', async ({ page }) => {
    const errors = collectNonAuthErrors(page);

    await page.goto(`${MAIN_URL}/imprint`);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-viewport.png`, fullPage: false });
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-fullpage.png`, fullPage: true });
  });
});
