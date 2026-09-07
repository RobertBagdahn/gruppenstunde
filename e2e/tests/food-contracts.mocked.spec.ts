import { test, expect } from '../fixtures/food';
import { assertRecord } from '../fixtures/api';

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

test('URL import preview maps the enhanced response and preserves metadata on create', async ({ foodPage }) => {
  const draft = {
    recipe_draft: {
      title: 'Importiertes E2E Rezept',
      description: 'Importbeschreibung',
      summary: 'Importzusammenfassung',
      servings: 4,
      preparation_time: 10,
      execution_time: 20,
      recipe_type: 'warm_meal',
      difficulty: 'easy',
      execution_time_choice: 'less_30',
      preparation_time_choice: 'less_15',
      scout_level_ids: [2],
      tag_ids: [3],
      steps: ['Alles vermischen.', 'Servieren.'],
      source_url: 'https://example.test/recipe',
      image_url: '',
    },
    recipe_items: [{
      ingredient_id: 7,
      ingredient_name: 'E2E Mehl',
      quantity: 400,
      measuring_unit_id: 1,
      measuring_unit_name: 'g',
      note: 'gesiebt',
      is_new_ingredient: false,
      portion_id: 11,
    }],
    created_ingredients: [],
  };
  const created = recipeDetail('Importiertes E2E Rezept', 'importiertes-e2e-rezept');
  const recipeCreateBodies: Record<string, unknown>[] = [];

  await foodPage.route('**/api/auth/me/', (route) => route.fulfill({ json: mockUser }));
  await foodPage.route('**/api/recipes/import-from-url-enhanced/', (route) => route.fulfill({ json: draft }));
  await foodPage.route('**/api/recipes/', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    recipeCreateBodies.push(assertRecord(route.request().postDataJSON()));
    await route.fulfill({ json: created });
  });
  await foodPage.route('**/api/recipes/importiertes-e2e-rezept/steps/batch', (route) => route.fulfill({ json: [] }));
  await foodPage.route('**/api/recipes/by-slug/importiertes-e2e-rezept/', (route) => route.fulfill({ json: created }));
  await foodPage.route('**/api/recipes/101/steps/', (route) => route.fulfill({ json: [] }));

  await foodPage.goto('/recipes/new');
  await foodPage.getByText('Von URL importieren', { exact: true }).click();
  await foodPage.locator('input[type="url"]').fill('https://example.test/recipe');
  await foodPage.getByRole('button', { name: 'Importieren' }).click();
  await expect(foodPage.getByRole('heading', { name: 'Vorschau' })).toBeVisible();
  await expect(foodPage.getByText('für 4 Personen')).toBeVisible();
  await expect(foodPage.getByText('Alles vermischen.')).toBeVisible();

  await foodPage.getByTestId('recipe-serving-context-confirm').click();
  await foodPage.getByRole('button', { name: 'Weiter' }).click();
  await expect.poll(() => recipeCreateBodies).toHaveLength(1);
  expect(recipeCreateBodies[0]).toMatchObject({
    title: 'Importiertes E2E Rezept',
    source_url: 'https://example.test/recipe',
    scout_level_ids: [2],
    tag_ids: [3],
  });
  expect((recipeCreateBodies[0].recipe_items as Array<Record<string, unknown>>)[0]?.quantity).toBe(100);
});

test('URL import shows classified German errors without partial navigation', async ({ foodPage }) => {
  await foodPage.route('**/api/auth/me/', (route) => route.fulfill({ json: mockUser }));
  await foodPage.route('**/api/recipes/import-from-url-enhanced/', (route) => route.fulfill({
    status: 422,
    json: { error_code: 'IMPORT_NO_RECIPE_FOUND', detail: 'No recipe' },
  }));

  await foodPage.goto('/recipes/new');
  await foodPage.getByText('Von URL importieren', { exact: true }).click();
  await foodPage.locator('input[type="url"]').fill('https://example.test/no-recipe');
  await foodPage.getByRole('button', { name: 'Importieren' }).click();
  await expect(foodPage.getByRole('main').getByText('Auf der Seite wurden keine Rezeptdaten gefunden.')).toBeVisible();
  expect(foodPage.url()).toContain('/recipes/new');
});
