import { test, expect } from '../fixtures/food';
import { assertRecord } from '../fixtures/api';
import { confirmableReviewRow, REVIEW_PREVIEW_ROUTE, reviewPreview } from '../fixtures/ingredientReview';

const mockUser = {
  id: 1,
  email: 'e2e@example.test',
  first_name: 'E2E',
  last_name: 'Test',
  is_staff: true,
};

function recipeDetail(title: string, slug: string) {
  return {
    id: 101,
    title,
    slug,
    summary: 'Zusammenfassung',
    summary_long: '',
    description: 'Beschreibung',
    execution_time: 'less_30',
    preparation_time: 'none',
    difficulty: 'easy',
    status: 'draft',
    image_url: null,
    like_score: 0,
    view_count: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    scout_levels: [],
    tags: [],
    authors: [],
    emotion_counts: {},
    user_emotion: null,
    can_edit: true,
    can_delete: true,
    recipe_type: 'warm_meal',
    portions: 1,
    preparation_method: '',
    equipment: [],
    shared_groups: [],
    owner_name: 'E2E Test',
    visibility: 'private',
    recipe_badge: 'personal',
    source_url: 'https://example.test/recipe',
    is_owner: true,
    usage_in_meal_plans_count: 0,
    nutritional_tags: [],
    recipe_items: [],
    next_best_recipes: [],
    steps: [],
    steps_count: 0,
    has_structured_steps: false,
  };
}

const mehlRow = confirmableReviewRow({
  key: 'row-0',
  sourceText: '400 g Mehl',
  ingredientId: 7,
  ingredientName: 'E2E Mehl',
  portionId: 11,
  quantity: 400,
});

test('unified smart recipe wizard reviews AI ingredients and creates the draft', async ({ foodPage }) => {
  const created = recipeDetail('Smart E2E Rezept', 'smart-e2e-rezept');
  const previewBodies: Record<string, unknown>[] = [];
  const recipeCreateBodies: Record<string, unknown>[] = [];
  const preview = reviewPreview({
    title: 'Smart E2E Rezept',
    description: '## Zubereitung\nAlles gut vermischen.',
    summary: 'Schnell und einfach',
    servings: 4,
    preparation_time: 10,
    execution_time: 20,
    preparation_time_choice: 'less_15',
    steps: ['Alles gut vermischen.'],
  }, [mehlRow]);

  await foodPage.route('**/api/auth/me/', (route) => route.fulfill({ json: mockUser }));
  await foodPage.route('**/api/recipes/', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    recipeCreateBodies.push(assertRecord(route.request().postDataJSON()));
    await route.fulfill({ json: created });
  });
  await foodPage.route(REVIEW_PREVIEW_ROUTE, async (route) => {
    previewBodies.push(assertRecord(route.request().postDataJSON()));
    await route.fulfill({ json: preview });
  });
  await foodPage.route('**/api/recipes/by-slug/smart-e2e-rezept/', (route) => route.fulfill({ json: created }));
  await foodPage.route('**/api/recipes/101/steps/', (route) => route.fulfill({ json: [] }));
  await foodPage.route('**/api/recipes/smart-e2e-rezept/steps/batch', (route) => route.fulfill({ json: [] }));

  await foodPage.goto('/recipes/new');
  await expect(foodPage.getByTestId('recipe-smart-input')).toBeVisible();
  await expect(foodPage.getByText('Manuell', { exact: true })).toHaveCount(0);
  await foodPage.getByTestId('recipe-smart-input').fill('Kartoffelsuppe für 4 Personen');
  await foodPage.getByTestId('recipe-wizard-next').click();
  await expect.poll(() => previewBodies).toHaveLength(1);
  expect(previewBodies[0]).toEqual({ sources: [{ type: 'text', value: 'Kartoffelsuppe für 4 Personen' }] });

  await expect(foodPage.getByRole('heading', { name: 'Basis & Portionen' })).toBeVisible();
  await foodPage.getByTestId('recipe-serving-context-confirm').click();
  await foodPage.getByTestId('recipe-wizard-next').click();

  await expect(foodPage.getByRole('heading', { name: 'Zutaten prüfen' })).toBeVisible();
  await expect(foodPage.getByTestId('ingredient-review-row-row-0')).toContainText('400 g Mehl');
  await foodPage.getByRole('button', { name: 'Alle Vorschläge übernehmen' }).click();
  await expect(foodPage.getByTestId('ingredient-review-row-row-0')).toContainText('Bestätigt');
  await foodPage.getByTestId('recipe-wizard-next').click();

  await expect.poll(() => recipeCreateBodies).toHaveLength(1);
  expect(recipeCreateBodies[0]).toMatchObject({
    title: 'Smart E2E Rezept',
    steps: [expect.objectContaining({ instruction: 'Alles gut vermischen.' })],
  });
  await expect(foodPage.getByRole('heading', { name: 'Titel, Typ & Zutaten' })).toBeVisible();
});

test('smart input maps a URL result and preserves metadata on create', async ({ foodPage }) => {
  const created = recipeDetail('Importiertes E2E Rezept', 'importiertes-e2e-rezept');
  const recipeCreateBodies: Record<string, unknown>[] = [];
  const preview = reviewPreview({
    title: 'Importiertes E2E Rezept',
    description: 'Importbeschreibung',
    summary: 'Importzusammenfassung',
    servings: 4,
    preparation_time: 10,
    execution_time: 20,
    preparation_time_choice: 'less_15',
    scout_level_ids: [2],
    tag_ids: ['058e7081-bb7d-4412-a67c-a828052c3910'],
    steps: ['Alles vermischen.', 'Servieren.'],
    source_url: 'https://example.test/recipe',
  }, [mehlRow], { type: 'url', value: 'https://example.test/recipe' });

  await foodPage.route('**/api/auth/me/', (route) => route.fulfill({ json: mockUser }));
  await foodPage.route('**/api/recipes/', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    recipeCreateBodies.push(assertRecord(route.request().postDataJSON()));
    await route.fulfill({ json: created });
  });
  await foodPage.route(REVIEW_PREVIEW_ROUTE, (route) => route.fulfill({ json: preview }));
  await foodPage.route('**/api/recipes/importiertes-e2e-rezept/steps/batch', (route) => route.fulfill({ json: [] }));
  await foodPage.route('**/api/recipes/by-slug/importiertes-e2e-rezept/', (route) => route.fulfill({ json: created }));
  await foodPage.route('**/api/recipes/101/steps/', (route) => route.fulfill({ json: [] }));

  await foodPage.goto('/recipes/new');
  await foodPage.getByTestId('recipe-smart-input').fill('https://example.test/recipe');
  await foodPage.getByTestId('recipe-wizard-next').click();
  await expect(foodPage.getByRole('heading', { name: 'Basis & Portionen' })).toBeVisible();
  await expect(foodPage.getByTestId('recipe-serving-context-input')).toHaveValue('4');
  await foodPage.getByTestId('recipe-serving-context-confirm').click();
  await foodPage.getByTestId('recipe-wizard-next').click();

  await expect(foodPage.getByRole('heading', { name: 'Zutaten prüfen' })).toBeVisible();
  await foodPage.getByRole('button', { name: 'Alle Vorschläge übernehmen' }).click();
  await foodPage.getByTestId('recipe-wizard-next').click();
  await expect.poll(() => recipeCreateBodies).toHaveLength(1);
  expect(recipeCreateBodies[0]).toMatchObject({
    title: 'Importiertes E2E Rezept',
    source_url: 'https://example.test/recipe',
    scout_level_ids: [2],
    tag_ids: ['058e7081-bb7d-4412-a67c-a828052c3910'],
  });
  // Review quantities are totals for 4 servings; recipes store one portion.
  expect((recipeCreateBodies[0].recipe_items as Array<Record<string, unknown>>)[0]).toMatchObject({ portion_id: 11, quantity: 100 });
  expect((recipeCreateBodies[0].ingredient_review_rows as Array<Record<string, unknown>>)[0]).toMatchObject({
    key: 'row-0',
    status: 'confirmed',
    selected_ingredient_id: 7,
    quantity: 100,
  });
});

test('smart input shows the German preview error without partial navigation', async ({ foodPage }) => {
  // The preview endpoint returns plain `{ detail }` errors (no `error_code`),
  // and the wizard shows that detail in the error toast.
  const detail = 'Die Seite konnte nicht geladen werden und auch die Websuche hat kein passendes Rezept gefunden. '
    + 'Bitte kopiere den Rezepttext oder versuche eine andere Quelle.';
  await foodPage.route('**/api/auth/me/', (route) => route.fulfill({ json: mockUser }));
  await foodPage.route(REVIEW_PREVIEW_ROUTE, (route) => route.fulfill({ status: 422, json: { detail } }));

  await foodPage.goto('/recipes/new');
  await foodPage.getByTestId('recipe-smart-input').fill('https://example.test/no-recipe');
  await foodPage.getByTestId('recipe-wizard-next').click();
  await expect(foodPage.getByText('Analyse fehlgeschlagen')).toBeVisible();
  await expect(foodPage.getByText(detail)).toBeVisible();
  await expect(foodPage.getByRole('heading', { name: 'Basis & Portionen' })).toHaveCount(0);
  expect(foodPage.url()).toContain('/recipes/new');
});
