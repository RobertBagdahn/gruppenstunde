import { test, expect } from '../fixtures/food';
import { assertRecord, expectJsonResponse, getCsrfToken } from '../fixtures/api';
import { confirmableReviewRow, REVIEW_PREVIEW_ROUTE, reviewPreview } from '../fixtures/ingredientReview';

type FoodApi = Parameters<typeof getCsrfToken>[0];

async function createRecipeFixture(
  api: FoodApi,
  resources: { track: (resource: { kind: 'ingredient' | 'recipe'; id?: number; slug?: string }) => void },
  uniqueName: (prefix: string) => string,
): Promise<{ recipe: Record<string, unknown>; ingredient: Record<string, unknown>; portion: Record<string, unknown> }> {
  const csrf = await getCsrfToken(api);
  const ingredientResponse = await api.post('/api/ingredients/', {
    headers: { 'X-CSRFToken': csrf },
    data: { name: uniqueName('E2E Rezeptzutat'), description: 'Rezept fixture' },
  });
  const ingredient = assertRecord(await expectJsonResponse(ingredientResponse));
  resources.track({ kind: 'ingredient', slug: String(ingredient.slug) });

  const units = await api.get('/api/supplies/measuring-units/').then((response) => response.json()) as Array<{ id: number; name: string }>;
  const grams = units.find((unit) => unit.name.toLowerCase() === 'gramm');
  expect(grams).toBeTruthy();
  const portionResponse = await api.post(`/api/ingredients/${ingredient.slug}/portions/`, {
    headers: { 'X-CSRFToken': csrf },
    data: { name: uniqueName('E2E Rezeptportion'), quantity: 100, measuring_unit_id: grams?.id, weight_g: 100 },
  });
  const portion = assertRecord(await expectJsonResponse(portionResponse));
  const recipeResponse = await api.post('/api/recipes/', {
    headers: { 'X-CSRFToken': csrf },
    data: {
      title: uniqueName('E2E Rezept'),
      recipe_type: 'warm_meal',
      portions: 1,
      recipe_items: [{ portion_id: Number(portion.id), quantity: 1, sort_order: 0, note: '', is_optional: false }],
    },
  });
  const recipe = assertRecord(await expectJsonResponse(recipeResponse));
  resources.track({ kind: 'recipe', id: Number(recipe.id) });
  return { recipe, ingredient, portion };
}

async function advanceToPreview(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Zubereitung' })).toBeVisible();
  await page.getByTestId('recipe-wizard-next').click();
  await expect(page.getByRole('heading', { name: 'Vorschau & Speichern' })).toBeVisible();
}

async function confirmIngredientSave(page: import('@playwright/test').Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dialog.getByRole('button', { name: 'Speichern', exact: true }).click();
  }
}

test.describe('Recipe persistence integrity', () => {
  test('persists manual title, metadata, and preparation through the full wizard', async ({ foodPage, resources, uniqueName }) => {
    const title = uniqueName('E2E Wizard Rezept');
    // Empty `rows` skips the "Zutaten prüfen" step.
    await foodPage.route(REVIEW_PREVIEW_ROUTE, (route) => route.fulfill({ json: reviewPreview({ title }) }));
    await foodPage.goto('/recipes/new');
    await foodPage.getByTestId('recipe-smart-input').fill(title);
    await foodPage.getByTestId('recipe-wizard-next').click();
    await foodPage.getByTestId('recipe-serving-context-confirm').click();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await foodPage.getByRole('button', { name: 'Warme Mahlzeit' }).first().click();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await confirmIngredientSave(foodPage);

    await foodPage.getByPlaceholder('Kurze Zusammenfassung...').fill('E2E Zusammenfassung');
    await foodPage.getByPlaceholder('Ausführliche Beschreibung in Markdown...').fill('E2E Beschreibung');
    await expect(foodPage.getByRole('heading', { name: 'Zubereitung' })).toBeVisible();
    await foodPage.getByRole('button', { name: /Ersten Schritt hinzufügen/i }).click();
    await foodPage.getByPlaceholder(/Mehl und/).fill('E2E Zubereitungsschritt');
    // Ensure blur triggers state update
    await foodPage.getByPlaceholder(/Mehl und/).blur();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await expect(foodPage.getByTestId('recipe-wizard-finish')).toBeVisible({ timeout: 15000 });
    await foodPage.getByTestId('recipe-wizard-finish').click();
    await foodPage.waitForURL(/\/recipes\/[^/]+$/);

    const slug = foodPage.url().split('/').pop();
    expect(slug).toBeTruthy();
    const recipeDetail = assertRecord(await foodPage.request.get(`/api/recipes/by-slug/${slug}/`).then((response) => response.json()));
    resources.track({ kind: 'recipe', id: Number(recipeDetail.id) });
    await expect(foodPage.getByRole('heading', { name: title })).toBeVisible();
    await expect(foodPage.getByText('E2E Zusammenfassung')).toBeVisible();
    await foodPage.getByRole('button', { name: /Strukturierte Schritte/ }).click();
    await expect(foodPage.getByText('E2E Zubereitungsschritt')).toBeVisible();
  });

  test('keeps an intercepted AI draft editable through reload', async ({ foodPage, api, resources, uniqueName }) => {
    const { recipe: fixture, ingredient, portion } = await createRecipeFixture(api, resources, uniqueName);
    const title = uniqueName('E2E KI Rezept');
    await foodPage.route(REVIEW_PREVIEW_ROUTE, (route) => route.fulfill({ json: reviewPreview({
      title,
      description: String(fixture.description ?? ''),
      servings: 4,
    }, [confirmableReviewRow({
      key: 'row-0',
      sourceText: '168 g Fixture Zutat',
      ingredientId: Number(ingredient.id),
      ingredientName: String(ingredient.name),
      ingredientSlug: String(ingredient.slug),
      portionId: Number(portion.id),
      portionName: String(portion.name),
      quantity: 168,
    })]) }));

    await foodPage.goto('/recipes/new');
    await foodPage.getByTestId('recipe-smart-input').fill('E2E KI Rezept');
    await foodPage.getByTestId('recipe-wizard-next').click();
    await foodPage.getByTestId('recipe-serving-context-confirm').click();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await expect(foodPage.getByRole('heading', { name: 'Zutaten prüfen' })).toBeVisible();
    await foodPage.getByRole('button', { name: 'Alle Vorschläge übernehmen' }).click();
    // Leaving the review step creates the draft through the real backend.
    const createResponse = foodPage.waitForResponse((response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/api/recipes/');
    await foodPage.getByTestId('recipe-wizard-next').click();
    const createdResponse = await createResponse;
    expect(createdResponse.ok()).toBe(true);
    const created = assertRecord(await createdResponse.json());
    resources.track({ kind: 'recipe', id: Number(created.id) });
    await expect(foodPage.getByRole('heading', { name: 'Titel, Typ & Zutaten' })).toBeVisible();
    const quantity = foodPage.locator('input[data-testid^="item-quantity-"]').first();
    await quantity.fill('42');
    await foodPage.getByTestId('recipe-wizard-next').click();
    await confirmIngredientSave(foodPage);
    await advanceToPreview(foodPage);
    await foodPage.getByTestId('recipe-wizard-finish').click();
    await foodPage.waitForURL(/\/recipes\/[^/]+$/);
    await foodPage.reload();
    await foodPage.getByTestId('ingredients-edit-trigger').click();
    await foodPage.getByTestId('recipe-serving-context-input').fill('4');
    await foodPage.getByTestId('recipe-serving-context-confirm').click();
    await expect(foodPage.locator('input[data-testid^="item-quantity-"]').first()).toHaveValue('42');
  });

  test('confirms four-person quantity normalization before saving', async ({ foodPage, api, resources, uniqueName }) => {
    const { recipe } = await createRecipeFixture(api, resources, uniqueName);
    const slug = String(recipe.slug);
    await foodPage.goto(`/recipes/${slug}`);
    await foodPage.getByTestId('ingredients-edit-trigger').click();
    await foodPage.getByTestId('recipe-serving-context-input').fill('4');
    await foodPage.getByTestId('recipe-serving-context-confirm').click();
    await expect(foodPage.getByTestId('recipe-serving-context-summary')).toContainText('Gesamtmengen für 4 Personen');
    await foodPage.getByTestId('ingredient-editor-save').click();
    // With no ingredient changes, saving is a no-op and does not need a
    // confirmation dialog. The serving context itself remains visible.
    await expect(foodPage.getByRole('dialog')).toHaveCount(0);
    await expect(foodPage.getByTestId('recipe-ingredient-editor')).toBeVisible();
  });
});
