import { test, expect } from '../fixtures/food';
import { assertRecord, expectJsonResponse, getCsrfToken } from '../fixtures/api';

type FoodApi = Parameters<typeof getCsrfToken>[0];

async function createRecipeFixture(
  api: FoodApi,
  resources: { track: (resource: { kind: 'ingredient' | 'recipe'; id?: number; slug?: string }) => void },
  uniqueName: (prefix: string) => string,
): Promise<Record<string, unknown>> {
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
      input_servings: 1,
      recipe_items: [{ portion_id: Number(portion.id), quantity: 1, sort_order: 0, note: '', is_optional: false }],
    },
  });
  const recipe = assertRecord(await expectJsonResponse(recipeResponse));
  resources.track({ kind: 'recipe', id: Number(recipe.id) });
  return recipe;
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

function reviewPreview(title: string, rows: Array<Record<string, unknown>> = []): Record<string, unknown> {
  return {
    rows,
    sources: [],
    ai_interaction_id: null,
    is_reconstructed: false,
    recipe_draft: {
      title, description: '', summary: '', servings: 4,
      preparation_time: null, execution_time: null, recipe_type: 'warm_meal', difficulty: 'easy',
      execution_time_choice: 'less_30', preparation_time_choice: 'none', scout_level_ids: [], tag_ids: [],
      steps: [], source_url: '', image_url: '',
    },
  };
}

test.describe('Recipe persistence integrity', () => {
  test('persists manual title, metadata, and preparation through the full wizard', async ({ foodPage, resources, uniqueName }) => {
    const title = uniqueName('E2E Wizard Rezept');
    await foodPage.route('**/api/recipes/ingredient-review/preview/', (route) => route.fulfill({ json: reviewPreview(title) }));
    await foodPage.goto('/recipes/new');
    await foodPage.getByTestId('recipe-smart-input').fill(title);
    await foodPage.getByTestId('recipe-wizard-next').click();
    await foodPage.getByTestId('recipe-serving-context-confirm').click();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await expect(foodPage.getByRole('heading', { name: 'Zutaten', exact: true })).toBeVisible();
    resources.track({ kind: 'recipe', id: Number(new URL(foodPage.url()).searchParams.get('draft')) });
    // Title and type were set in "Basis & Portionen" (the mocked analysis pre-selects "Warme Mahlzeit").
    await foodPage.getByTestId('recipe-wizard-next').click();
    await confirmIngredientSave(foodPage);
    await expect(foodPage.getByRole('heading', { name: 'Materialien', exact: true })).toBeVisible();
    await foodPage.getByTestId('recipe-wizard-next').click();

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
    await foodPage.waitForURL(/\/recipes\/[^/?]+$/);

    await expect(foodPage.getByRole('heading', { name: title })).toBeVisible();
    await expect(foodPage.getByText('E2E Zusammenfassung')).toBeVisible();
    await foodPage.getByRole('button', { name: /Zubereitungsschritte/ }).click();
    await expect(foodPage.getByText('E2E Zubereitungsschritt')).toBeVisible();
  });

  test('keeps a reviewed AI draft editable through reload and stores per-portion quantities', async ({ foodPage, api, resources, uniqueName }) => {
    const fixture = await createRecipeFixture(api, resources, uniqueName);
    const fixtureItem = (fixture.recipe_items as Array<Record<string, unknown>>)[0];
    const title = uniqueName('E2E KI Entwurf');
    await foodPage.route('**/api/recipes/ingredient-review/preview/', (route) => route.fulfill({ json: reviewPreview(title, [{
      key: 'row-1',
      source_text: '168 Fixture Zutat',
      selected_ingredient_id: Number(fixtureItem.ingredient_id),
      selected_ingredient_name: String(fixtureItem.ingredient_name),
      selected_portion: { id: Number(fixtureItem.portion_id), name: String(fixtureItem.portion_name), quantity: 1 },
      quantity: 168,
      status: 'confirmed',
    }]) }));

    await foodPage.goto('/recipes/new');
    await foodPage.getByTestId('recipe-smart-input').fill('E2E KI Rezept');
    await foodPage.getByTestId('recipe-wizard-next').click();
    await foodPage.getByTestId('recipe-serving-context-confirm').click();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await expect(foodPage.getByRole('heading', { name: 'Zutaten prüfen' })).toBeVisible();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await expect(foodPage.getByRole('heading', { name: 'Zutaten', exact: true })).toBeVisible();
    const draftId = Number(new URL(foodPage.url()).searchParams.get('draft'));
    resources.track({ kind: 'recipe', id: draftId });

    const stored = assertRecord(await foodPage.request.get(`/api/recipes/${draftId}/`).then((response) => response.json()));
    expect(stored.source_servings).toBe(4);
    expect((stored.recipe_items as Array<Record<string, unknown>>)[0].quantity).toBe(42);

    await foodPage.reload();
    await expect(foodPage.getByRole('heading', { name: 'Zutaten', exact: true })).toBeVisible();
    await expect(foodPage.getByTestId('recipe-source-servings')).toContainText('Originalrezept für 4 Personen');
    await expect(foodPage.locator('input[data-testid^="item-quantity-"]').first()).toHaveValue('168');
    await foodPage.getByTestId('recipe-wizard-next').click();
    await confirmIngredientSave(foodPage);
    await expect(foodPage.getByRole('heading', { name: 'Materialien', exact: true })).toBeVisible();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await advanceToPreview(foodPage);
    await foodPage.getByTestId('recipe-wizard-finish').click();
    await foodPage.waitForURL(/\/recipes\/[^/?]+$/);
  });

  test('confirms four-person quantity normalization before saving', async ({ foodPage, api, resources, uniqueName }) => {
    const recipe = await createRecipeFixture(api, resources, uniqueName);
    const slug = String(recipe.slug);
    await foodPage.goto(`/recipes/${slug}`);
    // The serving context is only asked for when the view is scaled beyond 1 portion.
    const increase = foodPage.getByRole('button', { name: 'Portion erhöhen' }).first();
    for (let i = 0; i < 3; i += 1) await increase.click();
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
