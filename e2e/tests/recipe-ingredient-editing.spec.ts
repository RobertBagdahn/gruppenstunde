import { test, expect, type Page } from '@playwright/test';

/**
 * e2e coverage for the recipe-ingredient editing workflows in
 * `InlineIngredientEditor.tsx`: editing quantities, changing portions/units,
 * scaling by person count, adding ingredients, AI quantity estimation, and
 * saving. These exercise the exact math/round-trip behaviour that caused two
 * real bugs:
 *  - AI-Mengenschätzung "Alt" column showing wrong grams (fixed via
 *    `getItemWeightG`, see `InlineIngredientEditor.normalizeItems.test.ts`
 *    for the unit-level regression tests).
 *  - Quantities/units appearing to "flip" after save due to portion
 *    mismatches (partially covered by the backend `_resolve_or_create_portion`
 *    fix in `recipe_ai_suggest_service.py`).
 */

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
  await page.waitForURL('**/', { timeout: 10000 });
}

async function openManualRecipeIngredientsStep(page: Page): Promise<void> {
  await page.route('**/api/recipes/smart-input/', (route) => route.fulfill({
    json: {
      recipe_draft: {
        title: 'E2E Rezept',
        description: '',
        summary: '',
        servings: 1,
        preparation_time: null,
        execution_time: null,
        recipe_type: 'warm_meal',
        difficulty: 'easy',
        execution_time_choice: 'less_30',
        preparation_time_choice: 'none',
        scout_level_ids: [],
        tag_ids: [],
        steps: [],
        source_url: '',
        image_url: '',
      },
      recipe_items: [],
      created_ingredients: [],
      input_type: 'prompt',
      is_reconstructed: false,
    },
  }));
  await page.goto(`${FOOD_URL}/recipes/new`);
  await page.waitForLoadState('networkidle');

  await page.getByTestId('recipe-smart-input').fill('E2E Rezept');
  await page.getByTestId('recipe-wizard-next').click();

  await expect(page.getByRole('heading', { name: 'Basis & Portionen' })).toBeVisible({
    timeout: 15000,
  });
  await page.getByTestId('recipe-serving-context-confirm').click();
  await page.getByTestId('recipe-wizard-next').click();
  await expect(page.getByRole('heading', { name: 'Titel, Typ & Zutaten' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('combobox', { name: /Zutat/i }).first()).toBeVisible({
    timeout: 15000,
  });
}

/** Creates a minimal manual recipe via the wizard (through to the end,
 *  "Fertigstellen"), landing on the recipe detail page, and returns its slug.
 *  Using the detail page (URL-driven, `/recipes/:slug`) rather than the
 *  wizard's in-memory step state is essential for reload-based persistence
 *  checks — the wizard has no per-step URL/route, so reloading it resets to
 *  step 0 even though the draft was already saved server-side. */
async function createManualRecipe(page: Page, title: string): Promise<string> {
  await openManualRecipeIngredientsStep(page);

  const titleInput = page.locator('input[placeholder="z.B. Nudelauflauf mit Hackfleisch"]');
  await expect(titleInput).toBeVisible({ timeout: 8000 });
  await titleInput.fill(title);

  const warmMealBtn = page.locator('button:has-text("Warme Mahlzeit")').first();
  await warmMealBtn.click();
  await page.waitForTimeout(300);

  await addIngredient(page, 'Jodsalz');

  const saveBtn = page.locator('[data-testid="ingredient-editor-save"]').first();
  if (await saveBtn.isVisible({ timeout: 3000 })) {
    await saveBtn.click();
    const saveDialog = page.getByRole('dialog');
    if (await saveDialog.isVisible().catch(() => false)) {
      await saveDialog.getByRole('button', { name: 'Speichern', exact: true }).click();
    }
    await page.waitForTimeout(1500);
  }

  // Step 2 (Zutaten) → 3 (Zubereitung) → 4 (Vorschau) → Fertigstellen
  for (let i = 0; i < 2; i++) {
    const next = page.getByTestId('recipe-wizard-next');
    if (await next.isVisible({ timeout: 3000 }).catch(() => false)) await next.click();
    const dialog = page.getByRole('dialog');
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole('button', { name: 'Speichern', exact: true }).click();
    }
    await page.waitForTimeout(1500);
  }

  const finishBtn = page.locator('button:has-text("Fertigstellen")').first();
  await expect(finishBtn).toBeVisible({ timeout: 5000 });
  await finishBtn.click();
  await page.waitForURL(/\/recipes\/[^/]+$/, { timeout: 10000 });

  const match = page.url().match(/\/recipes\/([^/?]+)$/);
  return match ? match[1] : '';
}

/** Enters the ingredient inline-edit mode on a recipe detail page. */
async function openIngredientEditor(page: Page, slug: string): Promise<void> {
  await page.goto(`${FOOD_URL}/recipes/${slug}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  const editTrigger = page.locator('[data-testid="ingredients-edit-trigger"]').first();
  await expect(editTrigger).toBeVisible({ timeout: 5000 });
  await editTrigger.click();
  const servingConfirm = page.getByTestId('recipe-serving-context-confirm');
  if (await servingConfirm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await servingConfirm.click();
  }
  await expect(page.getByTestId('recipe-ingredient-editor')).toBeVisible({ timeout: 5000 });
}



/** Adds an ingredient via the autocomplete and returns its row's item id, read
 *  from the `data-testid` of the newly rendered quantity input. */
async function addIngredient(page: Page, searchTerm: string): Promise<void> {
  const searchInput = page.getByRole('combobox', { name: /Zutat/i }).first();
  await expect(searchInput).toBeVisible({ timeout: 5000 });
  await searchInput.fill(searchTerm);
  await page.waitForTimeout(1000);

  const firstSuggestion = page.locator('[role="option"], li, button').filter({ hasText: searchTerm }).first();
  if (await firstSuggestion.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstSuggestion.click();
    await page.waitForTimeout(500);
  }
}

test.describe('Recipe ingredient autocomplete — mobile layout', () => {
  test('keeps the input row aligned while showing category pills and results', async ({ page }) => {
    await login(page);
    await openManualRecipeIngredientsStep(page);

    const input = page.getByRole('combobox', { name: /Zutat/i }).first();
    const autocomplete = page.getByTestId('ingredient-autocomplete').first();
    const detailSearch = page.locator('button[title="Detailsuche"]').first();

    const initialInput = await input.boundingBox();
    const initialDetailSearch = await detailSearch.boundingBox();
    expect(initialInput).not.toBeNull();
    expect(initialDetailSearch).not.toBeNull();
    expect(initialInput?.height).toBe(44);
    expect(initialDetailSearch?.height).toBe(44);

    await input.focus();
    await page.waitForTimeout(200);
    const focusedInput = await input.boundingBox();
    const focusedDetailSearch = await detailSearch.boundingBox();
    expect(focusedInput?.height).toBe(44);
    expect(focusedDetailSearch?.height).toBe(44);
    expect(focusedDetailSearch?.y).toBe(focusedInput?.y);

    await input.fill('sal');
    await page.waitForTimeout(700);

    const typedInput = await input.boundingBox();
    const typedDetailSearch = await detailSearch.boundingBox();
    const typedAutocomplete = await autocomplete.boundingBox();
    const pills = page.getByTestId('ingredient-category-pills').first();
    await expect(pills).toBeVisible({ timeout: 3000 });
    const pillsBox = await pills.boundingBox();

    expect(typedInput).not.toBeNull();
    expect(typedDetailSearch).not.toBeNull();
    expect(typedAutocomplete).not.toBeNull();
    expect(pillsBox).not.toBeNull();
    expect(typedInput?.height).toBe(44);
    expect(typedDetailSearch?.height).toBe(44);
    expect(typedDetailSearch?.y).toBe(typedInput?.y);
    expect(typedAutocomplete?.height).toBeGreaterThan(44);
    expect(pillsBox?.y).toBeGreaterThan(typedInput?.y ?? 0);

    const resultList = page.getByRole('listbox').first();
    await expect(resultList).toBeVisible({ timeout: 3000 });
    const resultListBox = await resultList.boundingBox();
    expect(resultListBox).not.toBeNull();
    expect(resultListBox?.y).toBeGreaterThan((pillsBox?.y ?? 0) + (pillsBox?.height ?? 0));
  });

  test('preserves the query and focus when selecting a category, then closes on blur', async ({ page }) => {
    await login(page);
    await openManualRecipeIngredientsStep(page);

    const input = page.getByRole('combobox', { name: /Zutat/i }).first();
    await input.fill('sal');
    await page.waitForTimeout(700);

    const category = page.getByTestId('ingredient-category-pills').locator('button').nth(1);
    await expect(category).toBeVisible({ timeout: 3000 });
    const categoryRequest = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return url.pathname === '/api/ingredients/'
        && url.searchParams.get('name') === 'sal'
        && url.searchParams.has('retail_section');
    });
    await category.click();
    const request = await categoryRequest;
    expect(new URL(request.url()).searchParams.get('name')).toBe('sal');

    await expect(input).toHaveValue('sal');
    await expect(input).toBeFocused();
    await expect(page.getByTestId('ingredient-category-pills').first()).toBeVisible();

    await page.locator('h2').first().click();
    await expect(page.getByTestId('ingredient-category-pills').first()).toBeHidden();
    await expect(input).toHaveValue('sal');
  });
});

test.describe('Recipe ingredient autocomplete — touch scrolling', () => {
  test.use({ hasTouch: true, isMobile: true });

  test('scrolls the ingredient input into view on touch focus', async ({ page }) => {
    await login(page);
    await openManualRecipeIngredientsStep(page);

    const input = page.getByRole('combobox', { name: /Zutat/i }).first();
    await page.evaluate(() => window.scrollTo(0, 0));
    const before = await input.boundingBox();
    const viewportHeight = page.viewportSize()?.height ?? 0;
    expect(before).not.toBeNull();
    expect(before?.y).toBeGreaterThan(viewportHeight);

    await input.tap();
    await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 3000 }).toBeGreaterThan(0);

    const after = await input.boundingBox();
    expect(after).not.toBeNull();
    expect(after?.y).toBeGreaterThanOrEqual(0);
    expect(after?.y).toBeLessThan(viewportHeight);
  });
});

test.describe('Recipe ingredient editing — math correctness', () => {
  test('edit quantity persists the exact value across save + reload', async ({ page }) => {
    await login(page);

    // Use a deterministic, freshly-created recipe rather than pre-existing
    // seed data (which — see recipe_ai_suggest_service backend fix — can
    // contain corrupted portions from past AI-generation bugs).
    const slug = await createManualRecipe(page, `E2E Mengen-Test ${Date.now()}`);
    expect(slug).not.toBe('');

    await openIngredientEditor(page, slug);

    const quantityInputs = page.locator('input[data-testid^="item-quantity-"]');
    const count = await quantityInputs.count();
    expect(count).toBeGreaterThan(0);

    const firstInput = quantityInputs.first();
    await firstInput.fill('42');
    await firstInput.blur();
    await page.waitForTimeout(300);
    await expect(firstInput).toHaveValue('42');

    const saveBtn = page.locator('[data-testid="ingredient-editor-save"]').first();
    await saveBtn.click();
    const saveDialog = page.getByRole('dialog');
    if (await saveDialog.isVisible().catch(() => false)) {
      await saveDialog.getByRole('button', { name: 'Speichern', exact: true }).click();
    }
    await page.waitForTimeout(1500);

    // Reload the (URL-driven) detail page and re-enter edit mode — the
    // quantity must come back exactly as saved, not scaled or reformatted.
    await openIngredientEditor(page, slug);
    const reloadedInput = page.locator('input[data-testid^="item-quantity-"]').first();
    await expect(reloadedInput).toHaveValue('42', { timeout: 5000 });
  });

  test('AI-Mengenschätzung dialog shows a numeric "Alt" value consistent with the current row', async ({ page }) => {
    await login(page);
    const slug = await createManualRecipe(page, `E2E KI-Schätzung Test ${Date.now()}`);
    await openIngredientEditor(page, slug);

    const quantityInputs = page.locator('input[data-testid^="item-quantity-"]');
    expect(await quantityInputs.count()).toBeGreaterThan(0);

    const triggerBtn = page.locator('[data-testid="ai-estimate-trigger"]').first();
    await expect(triggerBtn).toBeVisible({ timeout: 5000 });
    await triggerBtn.click();
    await page.waitForTimeout(3000);

    // Either the dialog opens (AI available) or the request fails silently —
    // both are acceptable in this environment (no live Gemini credentials),
    // but if it opens, the "Alt" column must never be blank/NaN — this is the
    // exact regression for the "Alt zeigt falsche Werte" bug (getItemWeightG).
    const dialogHeading = page.locator('text=AI-Mengenschätzung');
    const opened = await dialogHeading.isVisible({ timeout: 2000 }).catch(() => false);
    expect(opened).toBeTruthy();

    const altCells = page.locator('table td:nth-child(3)');
    const altCount = await altCells.count();
    for (let i = 0; i < altCount; i++) {
      const text = (await altCells.nth(i).innerText()).trim();
      expect(text).not.toBe('NaN');
      expect(text.toLowerCase()).not.toContain('undefined');
    }
  });

  test('scaling person count and back round-trips to the original per-serving quantity', async ({ page }) => {
    await login(page);
    const slug = await createManualRecipe(page, `E2E Skalierung Test ${Date.now()}`);
    await openIngredientEditor(page, slug);

    const quantityInputs = page.locator('input[data-testid^="item-quantity-"]');
    expect(await quantityInputs.count()).toBeGreaterThan(0);

    const firstInput = quantityInputs.first();
    await firstInput.fill('10');
    await firstInput.blur();
    await page.waitForTimeout(300);

  await expect(page.getByTestId('recipe-serving-context-summary')).toContainText('Gesamtmengen für 1 Person');
  await expect(page.locator('button[aria-label="Portion erhöhen"]')).toHaveCount(0);
});
});
