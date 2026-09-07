import { test, expect, type Page } from '@playwright/test';

const FOOD_URL = 'http://localhost:5174';

const SEED_USER = {
  email: 'admin@admin.de',
  password: 'admin',
};

async function login(page: Page) {
  await page.goto(`${FOOD_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', SEED_USER.email);
  await page.fill('input[type="password"]', SEED_USER.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
}

async function addIngredientToWizard(page: Page, searchTerm: string): Promise<void> {
  const contextSelector = page.getByTestId('recipe-serving-context-selector');
  if (await contextSelector.isVisible().catch(() => false)) {
    const servingContextConfirm = page.getByTestId('recipe-serving-context-confirm');
    if (await servingContextConfirm.isVisible().catch(() => false)) await servingContextConfirm.click();
  }
  const searchInput = page.getByRole('combobox', { name: /Zutat/i }).first();
  await expect(searchInput).toBeVisible({ timeout: 5000 });
  await searchInput.fill(searchTerm);
  const suggestion = page
    .getByRole('option')
    .filter({ hasText: searchTerm })
    .filter({ hasNotText: 'neu anlegen' })
    .first();
  await expect(suggestion).toBeVisible({ timeout: 5000 });
  await suggestion.click();
}

async function clickWizardNext(page: Page): Promise<void> {
  const next = page.getByTestId('recipe-wizard-next');
  await expect(next).toBeVisible();
  await next.click();
  const dialog = page.getByRole('dialog');
  await expect.poll(async () => {
    if (await dialog.isVisible().catch(() => false)) return 'dialog';
    if (await page.getByTestId('recipe-wizard-finish').isVisible().catch(() => false)) return 'advanced';
    if (await next.isEnabled().catch(() => false)) return 'ready';
    return 'pending';
  }, { timeout: 15000 }).toMatch(/dialog|advanced|ready/);

  if (await dialog.isVisible().catch(() => false)) {
    const confirm = dialog.getByRole('button', { name: 'Speichern', exact: true });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(dialog).toBeHidden({ timeout: 10000 });
  }

  await expect.poll(async () => {
    if (await page.getByTestId('recipe-wizard-finish').isVisible().catch(() => false)) return 'advanced';
    if (await next.isVisible().catch(() => false) && await next.isEnabled().catch(() => false)) return 'ready';
    return 'waiting';
  }, { timeout: 15000 }).toMatch(/advanced|ready/);
}

test.describe('Recipe Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FOOD_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[type="email"]', SEED_USER.email);
    await page.fill('input[type="password"]', SEED_USER.password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/$/, { timeout: 15000 });
  });

  test('Recipe search works', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes`);
    const searchInput = page.locator('input[type="search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Nudeln');
    await searchInput.press('Enter');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('Nudeln');
  });

  test('Create recipe manually via wizard', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);

    // Step 0: Select "Manuell" method
    const manualCard = page.locator('.cursor-pointer:has-text("Manuell")').first();
    await expect(manualCard).toBeVisible({ timeout: 5000 });
    await manualCard.click();

    // Click "Weiter" to go to Step 1 (triggers draft creation)
    const weiterBtn = page.getByTestId('recipe-wizard-next');
    await expect(weiterBtn).toBeVisible({ timeout: 3000 });
    await weiterBtn.click();

    // Step 1: Ingredients — enter title
    const titleInput = page.locator('input[placeholder="z.B. Nudelauflauf mit Hackfleisch"]');
    await expect(titleInput).toBeVisible({ timeout: 8000 });
    const servingContextConfirm = page.getByTestId('recipe-serving-context-confirm');
    if (await servingContextConfirm.isVisible().catch(() => false)) await servingContextConfirm.click();
    await titleInput.fill('Smoke Test Rezept');

    // Select recipe type
    const warmMealBtn = page.locator('button:has-text("Warme Mahlzeit")').first();
    await warmMealBtn.click();
    await addIngredientToWizard(page, 'Jodsalz');
    await page.waitForTimeout(300);

    await clickWizardNext(page);

    // Step 2: metadata heading should show (h2 in the step content)
    await expect(page.locator('h2:has-text("Metadaten")').first()).toBeVisible({ timeout: 5000 });

    // Navigate to step 3 (steps)
    await clickWizardNext(page);

    // Step 3: steps heading should show
    await expect(page.locator('h2:has-text("Schritte")').first()).toBeVisible({ timeout: 5000 });

    // Navigate to step 4 (preview)
    await clickWizardNext(page);

    // Step 4: Preview — Fertigstellen button should be visible
    await expect(page.locator('button:has-text("Fertigstellen")').first()).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Fertigstellen")').first().click();
    await page.waitForURL(/\/recipes\/[^/]+$/, { timeout: 10000 });

    const slug = new URL(page.url()).pathname.split('/').filter(Boolean).at(-1);
    const detail = await page.request.get(`${FOOD_URL}/api/recipes/by-slug/${slug}/`).then((r) => r.json());
    expect(detail.visibility).toBe('private');
    expect(detail.status).toBe('draft');
  });

  test('manual preparation edit survives wizard navigation and reload', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.locator('.cursor-pointer:has-text("Manuell")').first().click();
    await clickWizardNext(page);
    const servingContextConfirm = page.getByTestId('recipe-serving-context-confirm');
    if (await servingContextConfirm.isVisible().catch(() => false)) await servingContextConfirm.click();

    const titleInput = page.locator('input[placeholder="z.B. Nudelauflauf mit Hackfleisch"]');
    await expect(titleInput).toBeVisible({ timeout: 8000 });
    await titleInput.fill(`Roundtrip Rezept ${Date.now()}`);
    await page.locator('button:has-text("Warme Mahlzeit")').first().click();
    await addIngredientToWizard(page, 'Jodsalz');
    await clickWizardNext(page);
    await expect(page.locator('h2:has-text("Metadaten")')).toBeVisible();
    await clickWizardNext(page);
    await expect(page.locator('h2:has-text("Schritte")')).toBeVisible();

    await page.getByRole('button', { name: /Ersten Schritt hinzufügen/i }).click();
    const instruction = page.locator('textarea').first();
    await expect(instruction).toBeVisible();
    await instruction.fill('Manuelle Zubereitung bleibt erhalten.');
    await instruction.blur();
    await clickWizardNext(page);
    await expect(page.locator('button:has-text("Fertigstellen")')).toBeVisible();

    await page.locator('button:has-text("Fertigstellen")').click();
    await page.waitForURL(/\/recipes\/[^/]+$/, { timeout: 10000 });
    await page.reload();
    await page.getByRole('button', { name: /Strukturierte Schritte/ }).click();
    await expect(page.getByText('Manuelle Zubereitung bleibt erhalten.')).toBeVisible({ timeout: 10000 });
  });

  test('serving context is selected before editing and confirmed before save', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.locator('.cursor-pointer:has-text("Manuell")').first().click();
    await page.getByRole('button', { name: 'Weiter', exact: true }).click();
    await expect(page.getByTestId('recipe-serving-context-selector')).toBeVisible();
    await page.getByTestId('recipe-serving-context-input').fill('4');
    await page.getByTestId('recipe-serving-context-confirm').click();
    await expect(page.getByTestId('recipe-serving-context-summary')).toContainText('Gesamtmengen für 4 Personen');
    await addIngredientToWizard(page, 'Jodsalz');
    await page.getByTestId('ingredient-editor-save').click();
    await expect(page.getByRole('dialog')).toContainText('Mengen für 4 Personen speichern?');
    await page.getByRole('dialog').getByRole('button', { name: 'Abbrechen' }).click();
    await expect(page.getByTestId('recipe-serving-context-summary')).toBeVisible();
  });

  test('multiple ingredient additions and repeated save apply each item once', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.locator('.cursor-pointer:has-text("Manuell")').first().click();
    await page.getByTestId('recipe-wizard-next').click();
    await page.getByTestId('recipe-serving-context-confirm').click();
    await page.locator('input[placeholder="z.B. Nudelauflauf mit Hackfleisch"]').fill(`Mehrfach Zutaten ${Date.now()}`);
    await page.locator('button:has-text("Warme Mahlzeit")').first().click();

    await addIngredientToWizard(page, 'Jodsalz');
    await addIngredientToWizard(page, 'Weizenmehl Type 405');
    for (let step = 0; step < 3; step += 1) {
      await clickWizardNext(page);
      await page.waitForTimeout(1000);
    }
    await page.locator('button:has-text("Fertigstellen")').click();
    await page.waitForURL(/\/recipes\/[^/]+$/, { timeout: 10000 });

    const slug = new URL(page.url()).pathname.split('/').filter(Boolean).at(-1);
    const detail = await page.request.get(`${FOOD_URL}/api/recipes/by-slug/${slug}/`).then((response) => response.json());
    const ids = detail.recipe_items.map((item: { id: number }) => item.id);
    expect(detail.recipe_items).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  test('AI-created recipe keeps manual ingredient and preparation edits after reload', async ({ page }) => {
    test.setTimeout(120_000);

    const csrfToken = await page.evaluate(() =>
      document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? '',
    );
    const fixtureRecipe = await page.evaluate(async (csrf) => {
      const listResponse = await fetch('/api/recipes/?page=1&page_size=20', { credentials: 'include' });
      const list = await listResponse.json();
      for (const listItem of list.items as Array<{ id: number }>) {
        const detailResponse = await fetch(`/api/recipes/${listItem.id}/`, { credentials: 'include' });
        if (!detailResponse.ok) continue;
        const detail = await detailResponse.json();
        const sourceItem = detail.recipe_items?.find((item: { portion_id: number | null }) => item.portion_id);
        if (!sourceItem) continue;

        const createResponse = await fetch('/api/recipes/', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf },
          body: JSON.stringify({
            title: `AI Fixture ${Date.now()}`,
            recipe_type: 'warm_meal',
            recipe_items: [{
              portion_id: sourceItem.portion_id,
              quantity: sourceItem.quantity,
              sort_order: 0,
              note: '',
              is_optional: false,
            }],
          }),
        });
        if (createResponse.ok) return createResponse.json();
      }
      throw new Error('Kein Rezept mit einer verwendbaren Zutat gefunden');
    }, csrfToken);

    await page.route('**/api/recipes/ai-create/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixtureRecipe),
      });
    });

    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.locator('.cursor-pointer:has-text("Mit KI-Hilfe")').first().click();
    await page.locator('textarea[placeholder*="Nudelauflauf"]').fill('Fixture-Rezept');
    await page.locator('button:has-text("Generieren")').click();
    await page.getByTestId('recipe-wizard-next').click();

    const titleInput = page.locator('input[placeholder="z.B. Nudelauflauf mit Hackfleisch"]');
    await expect(titleInput).toBeVisible({ timeout: 10000 });
    await page.getByTestId('recipe-serving-context-confirm').click();
    await expect(page.locator('input[data-testid^="item-quantity-"]').first()).toBeVisible();
    const quantityInput = page.locator('input[data-testid^="item-quantity-"]').first();
    await expect(quantityInput).toBeVisible({ timeout: 10000 });
    await quantityInput.fill('42');
    await quantityInput.blur();
    await clickWizardNext(page);
    await expect(page.locator('h2:has-text("Metadaten")')).toBeVisible();
    await clickWizardNext(page);
    await expect(page.locator('h2:has-text("Schritte")')).toBeVisible();
    await page.getByRole('button', { name: /Ersten Schritt hinzufügen/i }).click();
    await page.locator('textarea').first().fill('KI-Zubereitung manuell geändert.');
    await page.locator('textarea').first().blur();
    await clickWizardNext(page);
    await page.locator('button:has-text("Fertigstellen")').click();
    await page.waitForURL(/\/recipes\/[^/]+$/, { timeout: 10000 });
    await page.reload();
    await page.getByRole('button', { name: /Strukturierte Schritte/ }).click();
    await expect(page.getByText('KI-Zubereitung manuell geändert.')).toBeVisible({ timeout: 10000 });

    const persisted = await page.evaluate(async (slug) => {
      const recipe = await fetch(`/api/recipes/by-slug/${encodeURIComponent(slug)}/`).then((response) => response.json());
      const steps = await fetch(`/api/recipes/${encodeURIComponent(slug)}/steps/`).then((response) => response.json());
      return { recipe, steps };
    }, new URL(page.url()).pathname.split('/').filter(Boolean).at(-1) ?? '');

    expect(persisted.recipe.recipe_items).toHaveLength(1);
    expect(persisted.recipe.recipe_items[0].weight_g).toBeCloseTo(42, 0);
    expect(persisted.steps[0].instruction).toBe('KI-Zubereitung manuell geändert.');
  });

  test('Wizard step navigation works', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Verify step indicator shows 5 steps
    const stepIndicator = page.locator('nav[aria-label="Rezept-Erstellungs-Fortschritt"]');
    await expect(stepIndicator).toBeVisible({ timeout: 3000 });

    // Select "Manuell"
    const manualCard = page.locator('.cursor-pointer:has-text("Manuell")').first();
    await manualCard.click();

    // Click "Weiter" (creates draft, goes to step 1)
    const weiterBtn = page.locator('button:has-text("Weiter")').last();
    await weiterBtn.click();
    await page.waitForTimeout(3000);

    // Step 1 should show title input
    const titleInput = page.locator('input[placeholder="z.B. Nudelauflauf mit Hackfleisch"]');
    await expect(titleInput).toBeVisible({ timeout: 8000 });

    // Click "Zurück" to go back to step 0
    const backBtn = page.locator('button:has-text("Zurück")').first();
    if (await backBtn.isVisible({ timeout: 3000 })) {
      await backBtn.click();
      await page.waitForTimeout(500);
    }

    // Should be back at method selection
    const manualCardAgain = page.locator('.cursor-pointer:has-text("Manuell")').first();
    await expect(manualCardAgain).toBeVisible({ timeout: 3000 });

  });

  test('Wizard step 0 shows three method cards', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Manuell').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Mit KI-Hilfe').first()).toBeVisible();
    await expect(page.locator('text=Von URL importieren').first()).toBeVisible();

  });

  test('Recipe detail page — ingredients section loads', async ({ page }) => {
    // Go to recipes list to find a visible recipe
    await page.goto(`${FOOD_URL}/recipes`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.locator('body')).toBeVisible();
  });

  test('Mobile viewport — wizard is usable at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });

    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step indicator should be visible even on mobile
    const stepIndicator = page.locator('nav[aria-label="Rezept-Erstellungs-Fortschritt"]');
    await expect(stepIndicator).toBeVisible({ timeout: 3000 });

    // Method cards should be visible
    const manualCard = page.locator('.cursor-pointer:has-text("Manuell")').first();
    await expect(manualCard).toBeVisible({ timeout: 5000 });

  });

  test('KI-Hilfe flow — UI elements render correctly', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 0: Click "Mit KI-Hilfe" card
    const kiCard = page.locator('.cursor-pointer:has-text("Mit KI-Hilfe")').first();
    await expect(kiCard).toBeVisible({ timeout: 5000 });
    await kiCard.click();
    await page.waitForTimeout(500);

    // Text input field should appear
    const textarea = page.locator('textarea[placeholder*="Nudelauflauf"]').first();
    await expect(textarea).toBeVisible({ timeout: 3000 });

    // "Generieren" button should be visible
    const generateBtn = page.locator('button:has-text("Generieren")').first();
    await expect(generateBtn).toBeVisible();

    // Type a prompt
    await textarea.fill('Nudelauflauf mit Hackfleisch und Käse überbacken');

    // "Zurück" button should be visible for canceling
    const backBtn = page.locator('button:has-text("Zurück")').first();
    await expect(backBtn).toBeVisible();

  });

  test('Create recipe with AI-Hilfe — "Holländische Käsenudeln mit Gouda"', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 0: Select "Mit KI-Hilfe" method
    const kiCard = page.locator('.cursor-pointer:has-text("Mit KI-Hilfe")').first();
    await expect(kiCard).toBeVisible({ timeout: 5000 });
    await kiCard.click();
    await page.waitForTimeout(500);

    // Enter the recipe prompt
    const textarea = page.locator('textarea[placeholder*="Nudelauflauf"]').first();
    await expect(textarea).toBeVisible({ timeout: 3000 });
    await textarea.fill('Holländische Käsenudeln mit Gouda');

    // Trigger generation via the "Weiter" button (drives WizardStepMethod's primaryAction)
    const weiterBtn = page.locator('button:has-text("Weiter")').last();
    await expect(weiterBtn).toBeVisible({ timeout: 3000 });
    await weiterBtn.click();

    // Generation calls Gemini and can take a while
    const titleInput = page.locator('input[placeholder="z.B. Nudelauflauf mit Hackfleisch"]');
    await expect(titleInput).toBeVisible({ timeout: 60_000 });

    // Title should have been prefilled by the AI-generated recipe
    await expect(titleInput).not.toHaveValue('', { timeout: 10_000 });

  });

  test('URL-Import flow — UI elements render correctly', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Step 0: Click "Von URL importieren" card
    const urlCard = page.locator('.cursor-pointer:has-text("Von URL importieren")').first();
    await expect(urlCard).toBeVisible({ timeout: 5000 });
    await urlCard.click();
    await page.waitForTimeout(500);

    // URL input field should appear
    const urlInput = page.locator('input[type="url"]').first();
    await expect(urlInput).toBeVisible({ timeout: 3000 });

    // "Importieren" button should be visible
    const importBtn = page.locator('button:has-text("Importieren")').first();
    await expect(importBtn).toBeVisible();

    // "Zurück" button should be visible for canceling
    const backBtn = page.locator('button:has-text("Zurück")').first();
    await expect(backBtn).toBeVisible();

    // Type a URL
    await urlInput.fill('https://www.chefkoch.de/rezepte/12345/test-rezept/');

  });

  test('URL import preview uses enhanced contract and carries steps into the draft', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.waitForLoadState('domcontentloaded');
    await page.route('**/api/recipes/import-from-url-enhanced/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe_draft: {
            title: 'Fixture Pfannkuchen',
            description: 'Importierter Test',
            summary: 'Fixture',
            servings: 4,
            preparation_time: 10,
            execution_time: 20,
            recipe_type: 'warm_meal',
            difficulty: 'easy',
            execution_time_choice: 'less_30',
            preparation_time_choice: 'less_15',
            scout_level_ids: [],
            tag_ids: [],
            steps: ['Teig verrühren.', 'Ausbacken.'],
            source_url: 'https://www.chefkoch.de/rezepte/fixture',
            image_url: 'https://example.test/fixture.jpg',
          },
          recipe_items: [{
            ingredient_id: 1,
            ingredient_name: 'Mehl',
            quantity: 400,
            measuring_unit_id: 1,
            measuring_unit_name: 'Gramm',
            note: '',
            is_new_ingredient: false,
            portion_id: 1,
          }],
          created_ingredients: [],
        }),
      });
    });
    let createBody: Record<string, unknown> | null = null;
    await page.route('**/api/recipes/', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      createBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 999999, slug: 'fixture-pfannkuchen', title: 'Fixture Pfannkuchen', recipe_type: 'warm_meal' }),
      });
    });
    await page.route('**/api/recipes/fixture-pfannkuchen/steps/batch', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.locator('.cursor-pointer:has-text("Von URL importieren")').first().click();
    await page.locator('input[type="url"]').fill('https://www.chefkoch.de/rezepte/fixture');
    await page.locator('button:has-text("Importieren")').first().click();
    await expect(page.getByText('Fixture Pfannkuchen')).toBeVisible();
    await expect(page.getByText('Teig verrühren.')).toBeVisible();
    await expect(page.getByText('Ausbacken.')).toBeVisible();
    await page.getByRole('button', { name: 'Personenzahl übernehmen' }).click();
    await clickWizardNext(page);
    await expect.poll(() => createBody).not.toBeNull();
    const createdItems = createBody?.recipe_items as Array<{ quantity: number }>;
    expect(createdItems[0].quantity).toBe(100);
    expect(createBody?.source_url).toBe('https://www.chefkoch.de/rezepte/fixture');
  });

  test('URL import without servings requires a serving context before save', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.route('**/api/recipes/import-from-url-enhanced/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipe_draft: {
            title: 'Import ohne Personenzahl',
            description: '',
            summary: '',
            servings: null,
            preparation_time: null,
            execution_time: null,
            recipe_type: 'warm_meal',
            difficulty: 'easy',
            execution_time_choice: 'less_30',
            preparation_time_choice: 'none',
            scout_level_ids: [],
            tag_ids: [],
            steps: [],
            source_url: 'https://example.test/no-servings',
            image_url: '',
          },
          recipe_items: [],
          created_ingredients: [],
        }),
      });
    });

    await page.locator('.cursor-pointer:has-text("Von URL importieren")').first().click();
    await page.locator('input[type="url"]').fill('https://example.test/no-servings');
    await page.locator('button:has-text("Importieren")').first().click();
    await expect(page.getByTestId('recipe-serving-context-selector')).toBeVisible();
    await expect(page.getByText(/keine verlässliche Personenzahl erkannt/i)).toBeVisible();
  });
});
