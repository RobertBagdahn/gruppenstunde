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
