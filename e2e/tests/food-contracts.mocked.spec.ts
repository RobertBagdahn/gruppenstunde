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

/** Mirrors `IngredientReviewRowSchema`: a complete row the "Zutaten prüfen"
 *  step can confirm directly. */
function reviewRow(source: { type: 'url' | 'text'; label: string; value: string }) {
  const portion = { id: 11, name: 'Gramm', quantity: 1, weight_g: 1, measuring_unit_id: 1, measuring_unit_name: 'g', is_new: false };
  return {
    key: 'row-1',
    source_text: '400 g Mehl',
    sources: [source],
    selected_ingredient_id: 7,
    selected_ingredient_slug: 'e2e-mehl',
    selected_ingredient_name: 'E2E Mehl',
    suggested_ingredient_id: 7,
    suggested_ingredient_name: 'E2E Mehl',
    candidates: [],
    selected_portion: portion,
    suggested_portion: portion,
    quantity: 400,
    suggested_quantity: 400,
    reason: '',
    technical_details: null,
    conflicts: [],
    new_ingredient_draft: null,
    status: 'open',
  };
}

test('unified smart recipe wizard accepts one AI result and preserves the draft flow', async ({ foodPage }) => {
  const created = recipeDetail('Smart E2E Rezept', 'smart-e2e-rezept');
  const smartBodies: Record<string, unknown>[] = [];
  const source = { type: 'text' as const, label: 'Eingefügter Text', value: 'Kartoffelsuppe für 4 Personen' };
  const draft = {
    rows: [reviewRow(source)],
    sources: [source],
    ai_interaction_id: null,
    recipe_draft: {
      title: 'Smart E2E Rezept',
      description: '## Zubereitung\nAlles gut vermischen.',
      summary: 'Schnell und einfach',
      servings: 4,
      preparation_time: 10,
      execution_time: 20,
      recipe_type: 'warm_meal',
      difficulty: 'easy',
      execution_time_choice: 'less_30',
      preparation_time_choice: 'less_15',
      scout_level_ids: [],
      tag_ids: [],
      steps: ['Alles gut vermischen.'],
      source_url: '',
      image_url: '',
    },
    is_reconstructed: false,
  };

  await foodPage.route('**/api/auth/me/', (route) => route.fulfill({ json: mockUser }));
  await foodPage.route('**/api/recipes/ingredient-review/preview/', async (route) => {
    smartBodies.push(assertRecord(route.request().postDataJSON()));
    await route.fulfill({ json: draft });
  });
  await foodPage.route('**/api/recipes/', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({ json: created });
  });
  await foodPage.route('**/api/recipes/by-slug/smart-e2e-rezept/', (route) => route.fulfill({ json: created }));
  await foodPage.route('**/api/recipes/101/steps/', (route) => route.fulfill({ json: [] }));
  await foodPage.route('**/api/recipes/smart-e2e-rezept/steps/batch', (route) => route.fulfill({ json: [] }));

  await foodPage.goto('/recipes/new');
  await expect(foodPage.getByTestId('recipe-smart-input')).toBeVisible();
  await expect(foodPage.getByText('Manuell', { exact: true })).toHaveCount(0);
  await foodPage.getByTestId('recipe-smart-input').fill('Kartoffelsuppe für 4 Personen');
  await foodPage.getByTestId('recipe-wizard-next').click();
  await expect.poll(() => smartBodies).toHaveLength(1);
  expect(smartBodies[0]).toEqual({ sources: [{ type: 'text', value: 'Kartoffelsuppe für 4 Personen' }] });

  await expect(foodPage.getByRole('heading', { name: 'Basis & Portionen' })).toBeVisible();
  await foodPage.getByTestId('recipe-serving-context-confirm').click();
  await foodPage.getByTestId('recipe-wizard-next').click();
  await expect(foodPage.getByRole('heading', { name: 'Zutaten prüfen' })).toBeVisible();
  await foodPage.getByRole('button', { name: 'Alle Vorschläge übernehmen' }).click();
  await foodPage.getByTestId('recipe-wizard-next').click();
  await expect(foodPage.getByRole('heading', { name: 'Titel, Typ & Zutaten' })).toBeVisible();
});

test('smart input maps a URL result and preserves metadata on create', async ({ foodPage }) => {
  const source = { type: 'url' as const, label: 'example.test', value: 'https://example.test/recipe' };
  const draft = {
    rows: [reviewRow(source)],
    sources: [source],
    ai_interaction_id: null,
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
      tag_ids: ['058e7081-bb7d-4412-a67c-a828052c3910'],
      steps: ['Alles vermischen.', 'Servieren.'],
      source_url: 'https://example.test/recipe',
      image_url: '',
    },
    is_reconstructed: false,
  };
  const created = recipeDetail('Importiertes E2E Rezept', 'importiertes-e2e-rezept');
  const recipeCreateBodies: Record<string, unknown>[] = [];

  await foodPage.route('**/api/auth/me/', (route) => route.fulfill({ json: mockUser }));
  await foodPage.route('**/api/recipes/ingredient-review/preview/', (route) => route.fulfill({ json: draft }));
  await foodPage.route('**/api/recipes/', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    recipeCreateBodies.push(assertRecord(route.request().postDataJSON()));
    await route.fulfill({ json: created });
  });
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

  // The recipe is created when the reviewed ingredients are confirmed.
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
  // 400 g total for 4 servings are stored per single portion.
  expect((recipeCreateBodies[0].recipe_items as Array<Record<string, unknown>>)[0]).toMatchObject({ portion_id: 11, quantity: 100 });
});

test('smart input shows classified German errors without partial navigation', async ({ foodPage }) => {
  await foodPage.route('**/api/auth/me/', (route) => route.fulfill({ json: mockUser }));
  // The preview hook shows `detail` verbatim, so the backend sends German text.
  await foodPage.route('**/api/recipes/ingredient-review/preview/', (route) => route.fulfill({
    status: 422,
    json: {
      error_code: 'IMPORT_NO_RECIPE_FOUND',
      detail: 'Auf der Seite wurden keine Rezeptdaten gefunden. Bitte prüfe den Link oder gib das Rezept manuell ein.',
    },
  }));

  await foodPage.goto('/recipes/new');
  await foodPage.getByTestId('recipe-smart-input').fill('https://example.test/no-recipe');
  await foodPage.getByTestId('recipe-wizard-next').click();
  await expect(foodPage.getByText('Auf der Seite wurden keine Rezeptdaten gefunden.')).toBeVisible();
  expect(foodPage.url()).toContain('/recipes/new');
});
