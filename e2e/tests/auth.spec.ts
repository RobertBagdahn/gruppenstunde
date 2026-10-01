import { test, expect } from '@playwright/test';
import { devLogin } from '../fixtures/auth';

const FOOD_URL = 'http://localhost:5174';
const SEED_USER = { email: 'admin@admin.de' };

test.describe('Authentication (social login only)', () => {
  test('CSRF token is available', async ({ request }) => {
    const response = await request.get(`${FOOD_URL}/api/auth/csrf/`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.csrfToken).toBeTruthy();
  });

  test('Anonymous session answers 200 with is_authenticated=false', async ({ request }) => {
    const response = await request.get(`${FOOD_URL}/api/auth/me/`);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ is_authenticated: false, user: null });
  });

  test('Login page offers providers, e-mail login (transition) and the dev login locally', async ({ page }) => {
    await page.goto(`${FOOD_URL}/login`);
    await expect(page.getByRole('heading', { name: 'Anmelden' })).toBeVisible();
    await expect(page.getByLabel('Entwicklungs-Login (nur lokal)')).toBeVisible();
    await expect(page.getByLabel('Passwort', { exact: true })).toBeVisible();
  });

  test('Existing e-mail/password accounts can still log in (transition period)', async ({ page }) => {
    await page.goto(`${FOOD_URL}/login`);
    await page.getByLabel('E-Mail-Adresse').fill(SEED_USER.email);
    await page.getByLabel('Passwort', { exact: true }).fill(process.env.FOOD_E2E_PASSWORD ?? 'admin');
    await page.getByRole('button', { name: 'Mit E-Mail anmelden' }).click();
    await page.waitForURL('**/', { timeout: 10000 });
    const me = await (await page.request.get(`${FOOD_URL}/api/auth/me/`)).json();
    expect(me.user.email).toBe(SEED_USER.email);
  });

  test('Wrong password gives a German error', async ({ request }) => {
    const csrf = await (await request.get(`${FOOD_URL}/api/auth/csrf/`)).json();
    const response = await request.post(`${FOOD_URL}/api/auth/login/`, {
      data: { email: SEED_USER.email, password: 'falsch' },
      headers: { 'X-CSRFToken': csrf.csrfToken, Referer: `${FOOD_URL}/` },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe('invalid_credentials');
  });

  test('Dev login creates a session and logout ends it', async ({ page }) => {
    await devLogin(page, SEED_USER.email, FOOD_URL);
    const me = await (await page.request.get(`${FOOD_URL}/api/auth/me/`)).json();
    expect(me.is_authenticated).toBe(true);
    expect(me.user.email).toBe(SEED_USER.email);

    await page.goto(`${FOOD_URL}/`);
    await page.getByRole('button', { name: 'Benutzermenü öffnen' }).click();
    await page.getByRole('menuitem', { name: 'Abmelden' }).click();
    await expect(page.getByRole('button', { name: 'Anmelden' })).toBeVisible();
  });
});

test.describe('Open access for visitors', () => {
  test('Ingredient database is readable without login', async ({ page }) => {
    await page.goto(`${FOOD_URL}/ingredients`);
    await expect(page.getByText('Melde dich an, um die Zutatendatenbank zu verwalten.')).toHaveCount(0);
  });

  test('Saving an ingredient as visitor opens the login dialog and keeps the draft', async ({ page }) => {
    await page.goto(`${FOOD_URL}/ingredients/new?prefillName=E2E%20Testzutat`);
    await page.getByRole('button', { name: /speichern|weiter/i }).last().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Kostenlos anmelden')).toBeVisible();

    await dialog.getByLabel('Entwicklungs-Login (nur lokal)').fill(SEED_USER.email);
    await dialog.getByRole('button', { name: 'Anmelden' }).click();
    await expect(dialog).toBeHidden();
  });
});
