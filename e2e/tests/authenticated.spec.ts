import { test, expect } from '@playwright/test';

const MAIN_URL = 'http://localhost:5173';
const FOOD_URL = 'http://localhost:5174';

const SEED_USER = {
  email: 'admin@admin.de',
  password: 'admin',
};

test.describe('Authenticated Pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FOOD_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', SEED_USER.email);
    await page.fill('input[type="password"]', SEED_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
  });

  test('My dashboard loads', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('403') && !text.includes('404')) {
          errors.push(text);
        }
      }
    });

    await page.goto(`${MAIN_URL}/my-dashboard`);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-viewport.png`, fullPage: false });
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-fullpage.png`, fullPage: true });
  });

  test('My recipes loads', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('403') && !text.includes('404')) {
          errors.push(text);
        }
      }
    });

    await page.goto(`${FOOD_URL}/recipes/my-recipes`);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-viewport.png`, fullPage: false });
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-fullpage.png`, fullPage: true });
  });

  test('Meal plans app loads', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('403') && !text.includes('404')) {
          errors.push(text);
        }
      }
    });

    await page.goto(`${FOOD_URL}/meal-plans/app`);
    await page.waitForLoadState('networkidle');

    expect(errors).toHaveLength(0);
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-viewport.png`, fullPage: false });
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-fullpage.png`, fullPage: true });
  });
});
