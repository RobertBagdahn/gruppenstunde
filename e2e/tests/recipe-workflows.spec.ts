import { devLogin } from '../fixtures/auth';
import { test, expect, type Page } from '@playwright/test';

const FOOD_URL = 'http://localhost:5174';
const SEED_USER = { email: 'admin@admin.de' };

async function login(page: Page) {
  await devLogin(page, SEED_USER.email, FOOD_URL);
  await page.goto(`${FOOD_URL}/`);
}

function recipeDetail() {
  return {
    id: 101,
    title: 'Smart E2E Rezept',
    slug: 'smart-e2e-rezept',
    summary: 'Schnell und einfach',
    summary_long: '',
    description: '## Zubereitung\nAlles gut vermischen.',
    execution_time: 'less_30',
    preparation_time: 'less_15',
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
    source_servings: 4,
    preparation_method: '',
    equipment: [],
    shared_groups: [],
    owner_name: 'Admin',
    visibility: 'private',
    recipe_badge: 'personal',
    source_url: '',
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

function smartPreview() {
  // No ingredient rows: the wizard skips "Zutaten prüfen" and creates the
  // draft when leaving "Basis & Portionen".
  return {
    rows: [],
    sources: [],
    ai_interaction_id: null,
    is_reconstructed: false,
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
  };
}

async function mockUnifiedWizard(page: Page) {
  const detail = recipeDetail();
  await page.route('**/api/recipes/ingredient-review/preview/', (route) => route.fulfill({ json: smartPreview() }));
  await page.route('**/api/recipes/', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    await route.fulfill({ json: detail });
  });
  await page.route('**/api/recipes/101/', (route) => route.fulfill({ json: detail }));
  await page.route('**/api/recipes/by-slug/smart-e2e-rezept/', (route) => route.fulfill({ json: detail }));
  await page.route('**/api/recipes/101/steps/', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/recipes/smart-e2e-rezept/steps/batch', (route) => route.fulfill({ json: [] }));
}

test.describe('Recipe Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Recipe search works', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes`);
    const searchInput = page.locator('input[type="search"]').first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Nudeln');
    await searchInput.press('Enter');
    await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('Nudeln');
  });

  test('unified wizard has one smart input and no method cards', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);
    await expect(page.getByTestId('recipe-smart-input')).toBeVisible();
    await expect(page.getByText('Manuell', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Mit KI-Hilfe', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Von URL importieren', { exact: true })).toHaveCount(0);
  });

  test('unified wizard advances through AI analysis and basis step', async ({ page }) => {
    await mockUnifiedWizard(page);
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.getByTestId('recipe-smart-input').fill('Kartoffelsuppe für 4 Personen');
    await expect(page.getByTestId('recipe-smart-analyze')).toHaveCount(0);
    await page.getByTestId('recipe-wizard-next').click();
    await expect(page.getByRole('heading', { name: 'Basis & Portionen' })).toBeVisible();
    await expect(page.locator('#recipe-basis-title')).toHaveValue('Smart E2E Rezept');
    await page.getByTestId('recipe-serving-context-confirm').click();
    await page.getByTestId('recipe-wizard-next').click();
    await expect(page.getByRole('heading', { name: 'Titel, Typ & Zutaten' })).toBeVisible();
    await expect.poll(() => new URL(page.url()).searchParams.get('draft')).toBe('101');
    expect(new URL(page.url()).searchParams.get('step')).toBe('ingredients');
  });

  test('unified wizard can start manually without AI', async ({ page }) => {
    await page.goto(`${FOOD_URL}/recipes/new`);
    await page.getByTestId('recipe-manual-start').click();
    await expect(page.getByRole('heading', { name: 'Basis & Portionen' })).toBeVisible();
    await expect(page.locator('#recipe-basis-title')).toHaveValue('');
    await expect(page.getByTestId('recipe-serving-context-input')).toHaveValue('');
  });

  test('unified wizard remains usable at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`${FOOD_URL}/recipes/new`);
    await expect(page.getByTestId('recipe-smart-input')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});
