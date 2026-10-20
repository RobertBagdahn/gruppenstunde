import { expect, test, type Page } from '@playwright/test';

import { STATUS_FIXTURE } from '../src/test/fixtures';

async function mockStatus(page: Page, response: { status?: number; body?: unknown } = {}) {
  await page.route('**/api/status', (route) =>
    route.fulfill({ status: response.status ?? 200, json: response.body ?? STATUS_FIXTURE }),
  );
}

test.describe('app shell (frontend-layout spec)', () => {
  test('renders the sidebar groups and highlights the active route', async ({ page }) => {
    await mockStatus(page);
    await page.goto('/products');

    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    for (const group of ['Arbeiten', 'Analyse', 'Daten']) await expect(nav.getByText(group, { exact: true })).toBeVisible();
    await expect(nav.getByRole('link', { name: /Artikel/ })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('navigation', { name: 'Brotkrumen' }).getByText('Artikel')).toBeVisible();
    await expect(page).toHaveTitle('Artikel · Rübert');
  });

  test('navigation changes the active entry', async ({ page }) => {
    await mockStatus(page);
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: /Fall-Inbox/ }).click();
    await expect(page).toHaveURL(/\/data\/cases$/);
    await expect(page.getByRole('link', { name: /Fall-Inbox/ })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('link', { name: /Entscheidungen/ })).not.toHaveAttribute('aria-current', 'page');
  });

  test('shows the import warning in the pipeline on every page', async ({ page }) => {
    await mockStatus(page);
    for (const path of ['/', '/products', '/data/quality']) {
      await page.goto(path);
      const stage = page.getByRole('list', { name: 'Datenfluss' }).getByRole('listitem').filter({ hasText: 'Import · 1 Hinweis' });
      await expect(stage).toBeVisible();
      await expect(stage.getByRole('img', { name: 'Hinweis' })).toBeVisible();
      await expect(stage).toHaveClass(/bg-warning-soft/);
    }
  });

  test('shows week, reference date and counters from the status endpoint', async ({ page }) => {
    await mockStatus(page);
    await page.goto('/');
    await expect(page.getByText('KW 21', { exact: true })).toBeVisible();
    await expect(page.getByText('MO 18.05.2026')).toBeVisible();
    await expect(page.getByRole('link', { name: /Entscheidungen/ })).toContainText('23');
  });

  test('shows a red stage when the status endpoint fails', async ({ page }) => {
    await mockStatus(page, { status: 503, body: { detail: 'Neuaufbau läuft.' } });
    await page.goto('/');
    await expect(page.getByText('Status nicht erreichbar')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Fehler' })).toBeVisible();
  });

  test('causes no horizontal page scroll', async ({ page }) => {
    await mockStatus(page);
    for (const path of ['/', '/styleguide']) {
      await page.goto(path);
      await expect(page.getByText('KW 21', { exact: true })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    }
  });

  test('loads the self-hosted Geist fonts', async ({ page }) => {
    await mockStatus(page);
    await page.goto('/');
    await expect(page.getByText('KW 21', { exact: true })).toBeVisible();
    const loaded = await page.evaluate(async () => {
      await document.fonts.ready;
      return { sans: document.fonts.check('14px Geist'), mono: document.fonts.check('14px "Geist Mono"') };
    });
    expect(loaded).toEqual({ sans: true, mono: true });
  });
});

test.describe('layout by viewport', () => {
  test('sidebar sits beside the content on desktop', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'desktop only');
    await mockStatus(page);
    await page.goto('/');
    const sidebar = await page.getByRole('complementary', { name: 'Navigation, Filter und Einstellungen' }).boundingBox();
    const main = await page.getByRole('main').boundingBox();
    expect(sidebar && main).toBeTruthy();
    expect(sidebar!.width).toBe(240);
    expect(main!.x).toBeGreaterThanOrEqual(sidebar!.x + sidebar!.width);
    expect(main!.y).toBeLessThan(sidebar!.y + 60);
  });

  test('sidebar wraps above the content on a phone', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-375', 'phone only');
    await mockStatus(page);
    await page.goto('/');
    const sidebar = await page.getByRole('complementary', { name: 'Navigation, Filter und Einstellungen' }).boundingBox();
    const main = await page.getByRole('main').boundingBox();
    expect(sidebar && main).toBeTruthy();
    expect(sidebar!.width).toBeLessThanOrEqual(375);
    expect(main!.y).toBeGreaterThanOrEqual(sidebar!.y + sidebar!.height);
  });
});

test.describe('styleguide (Task 4.3)', () => {
  test('shows tokens with live values and the sidebar building blocks', async ({ page }) => {
    await mockStatus(page);
    await page.goto('/styleguide');
    await expect(page.getByRole('heading', { name: 'Styleguide Layout D' })).toBeVisible();
    await expect(page.getByText('hsl(217 39% 6%)')).toBeVisible();

    const filters = page.getByRole('region', { name: 'Filter' });
    await filters.getByRole('radio', { name: 'Fremdmarke' }).click();
    await expect(filters.getByRole('radio', { name: 'Fremdmarke' })).toHaveAttribute('aria-checked', 'true');
    await filters.getByRole('button', { name: 'Zurücksetzen' }).click();
    await expect(filters.getByRole('radio', { name: 'Eigenmarke' })).toHaveAttribute('aria-checked', 'true');
  });
});
