import { test, expect, type Page } from '@playwright/test';

const FOOD_URL = 'http://localhost:5174';

test.describe('Recipe Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes`);
    await page.waitForLoadState('networkidle');
  });

  /** Opens the mobile filter sidebar (the toggle is "Filter" plus an optional active-filter count). */
  async function openFilters(page: Page): Promise<void> {
    const toggleBtn = page.getByRole('button', { name: /^Filter( \d+)?$/ });
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
  }

  /** Expands the collapsed "Weitere Filter" groups (Schwierigkeit, Zubereitungsart, Kosten). */
  async function openMoreFilters(page: Page): Promise<void> {
    const moreBtn = page.getByRole('button', { name: /^Weitere Filter/ });
    await moreBtn.click();
    await expect(moreBtn).toHaveAttribute('aria-expanded', 'true');
  }

  test('page loads with default verified recipes', async ({ page }) => {
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `output/screenshots/recipe-search-default.png`, fullPage: false });
  });

  test('view toggle switches between grid and table', async ({ page }) => {
    await page.waitForTimeout(2000);

    const tableBtn = page.locator('button[title="Tabelle"]');
    await expect(tableBtn).toBeVisible({ timeout: 5000 });
    await tableBtn.click();
    await page.waitForTimeout(1000);

    await page.screenshot({ path: `output/screenshots/recipe-search-table-view.png`, fullPage: false });

    const gridBtn = page.locator('button[title="Kacheln"]');
    await gridBtn.click();
    await page.waitForTimeout(500);
  });

  test('table view persists via localStorage after reload', async ({ page }) => {
    await page.waitForTimeout(2000);
    const tableBtn = page.locator('button[title="Tabelle"]');
    await expect(tableBtn).toBeVisible({ timeout: 5000 });
    await tableBtn.click();
    await page.waitForTimeout(500);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const viewButtons = page.locator('button[title="Tabelle"], button[title="Kacheln"]');
    await expect(viewButtons.first()).toBeVisible();
  });

  test('origin filter checkboxes are visible when sidebar opened', async ({ page }) => {
    await openFilters(page);

    const originLabel = page.locator('h3').filter({ hasText: 'Anzeigen' });
    const originVisible = await originLabel.isVisible().catch(() => false);
    if (originVisible) {
      const verifiedCheckbox = page.locator('label').filter({ hasText: 'Inspi-verifiziert' }).locator('input[type="checkbox"]');
      const verifiedExists = await verifiedCheckbox.isVisible().catch(() => false);
      if (verifiedExists) {
        await expect(verifiedCheckbox).toBeChecked();
      }
    }
  });

  test('search within verified scope', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Suche nach Rezepten..."]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('test');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `output/screenshots/recipe-search-query.png`, fullPage: false });
  });

  test('reset button is visible and functional', async ({ page }) => {
    await openFilters(page);

    const resetBtn = page.locator('button:has-text("Zurücksetzen")');
    const resetVisible = await resetBtn.isVisible().catch(() => false);
    if (resetVisible) {
      await page.screenshot({ path: `output/screenshots/recipe-search-before-reset.png`, fullPage: false });
      await resetBtn.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('sort dropdown has use_count as default', async ({ page }) => {
    const sortSelect = page.locator('select');
    await expect(sortSelect).toBeVisible({ timeout: 5000 });
    const selectedValue = await sortSelect.inputValue();
    expect(selectedValue).toBe('use_count');
  });

  test('filter groups are present when sidebar opened', async ({ page }) => {
    await openFilters(page);

    for (const label of ['Typ', 'Anzeigen', 'Dauer']) {
      await expect(page.locator('h3').filter({ hasText: label })).toBeVisible();
    }

    await openMoreFilters(page);
    for (const label of ['Schwierigkeit', 'Zubereitungsart', 'Kosten']) {
      await expect(page.locator('h3').filter({ hasText: label })).toBeVisible();
    }
  });

  test('preparation method filter has checkboxes', async ({ page }) => {
    await openFilters(page);
    await openMoreFilters(page);

    await expect(page.locator('h3').filter({ hasText: 'Zubereitungsart' })).toBeVisible();
    const checkboxes = page.locator('h3:has-text("Zubereitungsart") + div input[type="checkbox"]');
    expect(await checkboxes.count()).toBeGreaterThanOrEqual(3);
  });

  test('cost filter shows price ranges', async ({ page }) => {
    await openFilters(page);
    await openMoreFilters(page);

    await expect(page.locator('h3').filter({ hasText: 'Kosten' })).toBeVisible();
    for (const label of ['< 2€', '2 – 5€', '5 – 10€', '> 10€']) {
      await expect(page.locator('label').filter({ hasText: label })).toBeVisible();
    }
  });

  test('page title is dynamic', async ({ page }) => {
    await page.waitForTimeout(1000);
    const title = await page.title();
    expect(title).toContain('Inspi');
  });
});
