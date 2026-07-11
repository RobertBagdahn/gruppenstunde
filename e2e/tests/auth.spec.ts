import { test, expect } from '@playwright/test';

const FOOD_URL = 'http://localhost:5174';

const SEED_USER = {
  email: 'admin@admin.de',
  password: 'admin',
};

test.describe('Authentication', () => {
  test('CSRF token is available', async ({ request }) => {
    const response = await request.get('http://localhost:8000/api/auth/csrf/');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.csrfToken).toBeTruthy();
    expect(data.csrfToken.length).toBeGreaterThan(0);
  });

  test('Login via UI form succeeds', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto(`${FOOD_URL}/login`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="email"]', SEED_USER.email);
    await page.fill('input[type="password"]', SEED_USER.password);

    await page.click('button[type="submit"]');

    await page.waitForURL('**/', { timeout: 10000 });

    expect(errors).toHaveLength(0);
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-viewport.png`, fullPage: false });
    await page.screenshot({ path: `output/screenshots/${test.info().title.replace(/\s+/g, '-')}-fullpage.png`, fullPage: true });

    const sessionCookie = await page.context().cookies();
    const sessionId = sessionCookie.find((c) => c.name === 'sessionid');
    expect(sessionId).toBeTruthy();
  });

  test('Authenticated user info is returned', async ({ page }) => {
    await page.goto(`${FOOD_URL}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="email"]', SEED_USER.email);
    await page.fill('input[type="password"]', SEED_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });

    const response = await page.request.get('http://localhost:8000/api/auth/me/');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.email).toBe(SEED_USER.email);
  });
});
