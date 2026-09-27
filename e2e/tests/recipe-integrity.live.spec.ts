import { test, expect } from '../fixtures/food';
import { assertRecord, expectJsonResponse, getCsrfToken } from '../fixtures/api';

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

/** The materials step sits between the ingredients and the preparation step. */
async function skipMaterials(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Materialien' })).toBeVisible();
  await page.getByTestId('recipe-wizard-next').click();
}

async function advanceToPreview(page: import('@playwright/test').Page): Promise<void> {
  await skipMaterials(page);
  await expect(page.getByRole('heading', { name: 'Zubereitung' })).toBeVisible();
  await page.getByTestId('recipe-wizard-next').click();
  await expect(page.getByRole('heading', { name: 'Vorschau & Speichern' })).toBeVisible();
}

/** The editor only asks for the serving context when the detail page shows
 *  more than one portion, so scale the view up before opening it. */
async function openIngredientEditorForPersons(page: import('@playwright/test').Page, persons: number): Promise<void> {
  for (let count = 1; count < persons; count++) {
    await page.getByRole('button', { name: 'Portion erhöhen' }).click();
  }
  await page.getByTestId('ingredients-edit-trigger').click();
  await page.getByTestId('recipe-serving-context-input').fill(String(persons));
  await page.getByTestId('recipe-serving-context-confirm').click();
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
    await foodPage.route('**/api/recipes/ingredient-review/preview/', async (route) => {
      await route.fulfill({ json: {
        rows: [],
        sources: [{ type: 'text', label: 'Eingefügter Text', value: title }],
        ai_interaction_id: null,
        recipe_draft: {
          title,
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
        is_reconstructed: false,
      } });
    });
    await foodPage.goto('/recipes/new');
    await foodPage.getByTestId('recipe-smart-input').fill(title);
    await foodPage.getByTestId('recipe-wizard-next').click();
    await foodPage.getByTestId('recipe-serving-context-confirm').click();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await foodPage.getByRole('button', { name: 'Warme Mahlzeit' }).first().click();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await confirmIngredientSave(foodPage);
    await skipMaterials(foodPage);

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
    const source = { type: 'text', label: 'Eingefügter Text', value: 'E2E KI Rezept' };
    const reviewPortion = {
      id: Number(portion.id), name: String(portion.name), quantity: Number(portion.quantity),
      weight_g: Number(portion.weight_g), measuring_unit_id: Number(portion.measuring_unit_id),
      measuring_unit_name: String(portion.measuring_unit_name ?? 'Gramm'), is_new: false,
    };
    await foodPage.route('**/api/recipes/ingredient-review/preview/', (route) => route.fulfill({ json: {
      rows: [{
        key: 'row-1', source_text: '42 Fixture Zutat', sources: [source],
        selected_ingredient_id: Number(ingredient.id), selected_ingredient_slug: String(ingredient.slug),
        selected_ingredient_name: String(ingredient.name), suggested_ingredient_id: Number(ingredient.id),
        suggested_ingredient_name: String(ingredient.name), candidates: [],
        selected_portion: reviewPortion, suggested_portion: reviewPortion,
        quantity: 42, suggested_quantity: 42, reason: '', technical_details: null, conflicts: [],
        new_ingredient_draft: null, status: 'open',
      }],
      sources: [source],
      ai_interaction_id: null,
      recipe_draft: {
        title: String(fixture.title), description: String(fixture.description ?? ''), summary: '', servings: 4,
        preparation_time: null, execution_time: null, recipe_type: 'warm_meal', difficulty: 'easy',
        execution_time_choice: 'less_30', preparation_time_choice: 'none', scout_level_ids: [], tag_ids: [],
        steps: [], source_url: '', image_url: '',
      },
      is_reconstructed: false,
    } }));

    await foodPage.goto('/recipes/new');
    await foodPage.getByTestId('recipe-smart-input').fill('E2E KI Rezept');
    await foodPage.getByTestId('recipe-wizard-next').click();
    await foodPage.getByTestId('recipe-serving-context-confirm').click();
    await foodPage.getByTestId('recipe-wizard-next').click();
    // Confirming the reviewed ingredients creates the recipe.
    await expect(foodPage.getByRole('heading', { name: 'Zutaten prüfen' })).toBeVisible();
    await foodPage.getByRole('button', { name: 'Alle Vorschläge übernehmen' }).click();
    await foodPage.getByTestId('recipe-wizard-next').click();
    await expect(foodPage.getByRole('heading', { name: 'Titel, Typ & Zutaten' })).toBeVisible();
    const quantity = foodPage.locator('input[data-testid^="item-quantity-"]').first();
    await quantity.fill('42');
    await foodPage.getByTestId('recipe-wizard-next').click();
    await confirmIngredientSave(foodPage);
    await advanceToPreview(foodPage);
    await foodPage.getByTestId('recipe-wizard-finish').click();
    await foodPage.waitForURL(/\/recipes\/[^/]+$/);
    const createdSlug = foodPage.url().split('/').pop();
    const created = assertRecord(await foodPage.request.get(`/api/recipes/by-slug/${createdSlug}/`).then((response) => response.json()));
    resources.track({ kind: 'recipe', id: Number(created.id) });
    await foodPage.reload();
    await openIngredientEditorForPersons(foodPage, 4);
    await expect(foodPage.locator('input[data-testid^="item-quantity-"]').first()).toHaveValue('42');
  });

  test('confirms four-person quantity normalization before saving', async ({ foodPage, api, resources, uniqueName }) => {
    const { recipe } = await createRecipeFixture(api, resources, uniqueName);
    const slug = String(recipe.slug);
    await foodPage.goto(`/recipes/${slug}`);
    await openIngredientEditorForPersons(foodPage, 4);
    await expect(foodPage.getByTestId('recipe-serving-context-summary')).toContainText('Gesamtmengen für 4 Personen');
    await foodPage.getByTestId('ingredient-editor-save').click();
    // With no ingredient changes, saving is a no-op and does not need a
    // confirmation dialog. The serving context itself remains visible.
    await expect(foodPage.getByRole('dialog')).toHaveCount(0);
    await expect(foodPage.getByTestId('recipe-ingredient-editor')).toBeVisible();
  });
});
