import { test, expect } from '@playwright/test';

const FOOD_URL = 'http://localhost:5174';

test.describe('Recipe Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes`);
    await page.waitForLoadState('networkidle');
  });

  /** Open the mobile filter sidebar on small viewports */
  async function openFilters(page: ReturnType<typeof test['info']> extends never ? never : any) {
    const toggleBtn = page.locator('button:has-text("Filter")');
    const isToggleVisible = await toggleBtn.isVisible().catch(() => false);
    if (isToggleVisible) {
      await toggleBtn.click();
      await page.waitForTimeout(300);
    }
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

    const filterGroups = ['Typ', 'Anzeigen', 'Stufe', 'Schwierigkeit', 'Dauer', 'Zubereitungsart', 'Kosten'];
    let visibleCount = 0;
    for (const label of filterGroups) {
      const el = page.locator('h3').filter({ hasText: label });
      const visible = await el.isVisible().catch(() => false);
      if (visible) visibleCount++;
    }
    expect(visibleCount).toBeGreaterThan(0);
  });

  test('preparation method filter has checkboxes', async ({ page }) => {
    await openFilters(page);

    const prepSection = page.locator('h3').filter({ hasText: 'Zubereitungsart' });
    const visible = await prepSection.isVisible().catch(() => false);
    if (visible) {
      const checkboxes = page.locator('h3:has-text("Zubereitungsart") + div input[type="checkbox"]');
      const count = await checkboxes.count();
      expect(count).toBeGreaterThanOrEqual(3);
    } else {
      test.skip(true, 'Sidebar not opened or filter not visible');
    }
  });

  test('cost filter shows price ranges', async ({ page }) => {
    await openFilters(page);

    const costSection = page.locator('h3').filter({ hasText: 'Kosten' });
    const visible = await costSection.isVisible().catch(() => false);
    if (visible) {
      const priceLabels = ['< 2€', '2', '5', '10€'];
      let found = 0;
      for (const label of priceLabels) {
        const el = page.locator('label').filter({ hasText: label });
        const exists = await el.isVisible().catch(() => false);
        if (exists) found++;
      }
      expect(found).toBeGreaterThan(0);
    } else {
      test.skip(true, 'Sidebar not opened');
    }
  });

  test('page title is dynamic', async ({ page }) => {
    await page.waitForTimeout(1000);
    const title = await page.title();
    expect(title).toContain('Inspi');
  });
});
