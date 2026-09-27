import { test, expect } from '../fixtures/food';

const mockUser = {
  id: 1,
  email: 'e2e@example.test',
  first_name: 'E2E',
  last_name: 'Test',
  is_staff: true,
};

function ingredientItem(name: string) {
  return {
    id: 1,
    name,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    status: 'draft',
    energy_kcal: null,
    protein_g: null,
    fat_g: null,
    carbohydrate_g: null,
    nutri_class: null,
    price_per_kg: null,
    retail_section_id: null,
    retail_section_name: null,
    usage_count: 0,
    groups: [],
    can_edit: true,
    can_delete: true,
    can_verify: false,
  };
}

function shoppingList(name: string) {
  return {
    id: 42,
    name,
    owner_id: 1,
    owner_username: 'e2e',
    source_type: 'manual',
    source_id: null,
    items_count: 0,
    checked_count: 0,
    collaborators_count: 0,
    created_at: '2026-09-06T10:00:00Z',
    updated_at: '2026-09-06T10:00:00Z',
    can_edit: true,
    can_delete: true,
  };
}

test.beforeEach(async ({ foodPage }) => {
  await foodPage.route('**/api/auth/me/', (route) => route.fulfill({ json: mockUser }));
  await foodPage.route('**/api/retail-sections/', (route) => route.fulfill({ json: [] }));
});

test('restores Ingredient search, filter, sort, and page from the URL after reload', async ({ foodPage }) => {
  await foodPage.route('**/api/ingredients/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== '/api/ingredients/' || route.request().method() !== 'GET') {
      return route.continue();
    }
    return route.fulfill({
      json: {
        items: [ingredientItem('URL E2E Zutat')],
        total: 41,
        page: Number(url.searchParams.get('page') ?? 1),
        page_size: 20,
        total_pages: 3,
      },
    });
  });

  await foodPage.goto('/ingredients?name=URL%20E2E&status=draft&sort=name_asc&page=2');
  await expect(foodPage.getByPlaceholder('Zutat suchen...')).toHaveValue('URL E2E');
  await expect(foodPage.locator('select').last()).toHaveValue('name_asc');
  await expect(foodPage.getByText('URL E2E Zutat', { exact: true })).toBeVisible();
  await foodPage.reload();
  await expect(foodPage.getByPlaceholder('Zutat suchen...')).toHaveValue('URL E2E');
  expect(new URL(foodPage.url()).searchParams.get('status')).toBe('draft');
  expect(new URL(foodPage.url()).searchParams.get('sort')).toBe('name_asc');
  expect(new URL(foodPage.url()).searchParams.get('page')).toBe('2');
});

test('restores ShoppingList search, page, sort, and owner filter after reload', async ({ foodPage }) => {
  await foodPage.route('**/api/shopping-lists/**', (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== '/api/shopping-lists/' || route.request().method() !== 'GET') {
      return route.continue();
    }
    return route.fulfill({
      json: {
        items: [shoppingList('URL E2E Einkaufsliste')],
        total: 21,
        page: Number(url.searchParams.get('page') ?? 1),
        page_size: 20,
        total_pages: 2,
      },
    });
  });

  await foodPage.goto('/shopping-lists?q=URL%20E2E&page=2');
  await expect(foodPage.getByPlaceholder('Einkaufsliste suchen...')).toHaveValue('URL E2E');
  await expect(foodPage.getByText('URL E2E Einkaufsliste', { exact: true })).toBeVisible();
  await foodPage.getByRole('combobox').selectOption('name_asc');
  await foodPage.getByRole('button', { name: 'Meine Daten' }).click();
  await expect.poll(() => new URL(foodPage.url()).searchParams.get('mine')).toBe('1');
  expect(new URL(foodPage.url()).searchParams.get('sort')).toBe('name_asc');
  await foodPage.reload();
  await expect(foodPage.getByPlaceholder('Einkaufsliste suchen...')).toHaveValue('URL E2E');
  await expect(foodPage.getByRole('combobox')).toHaveValue('name_asc');
  await expect(foodPage.getByRole('button', { name: 'Meine Daten' })).toHaveClass(/bg-primary/);
  expect(new URL(foodPage.url()).searchParams.get('q')).toBe('URL E2E');
  expect(new URL(foodPage.url()).searchParams.get('page')).toBe('2');
});

test('keeps recipe list filters when returning via the bottom navigation', async ({ foodPage }) => {
  const recipeQueries: string[] = [];
  await foodPage.route('**/api/recipes/?*', (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    recipeQueries.push(new URL(route.request().url()).search);
    return route.fulfill({ json: { items: [], total: 0, page: 1, page_size: 20, total_pages: 1 } });
  });

  await foodPage.goto('/recipes?origin=mine&sort=newest');
  await expect(foodPage.getByTestId('active-filters-hint')).toContainText('2 Filter aktiv');
  // In-app navigation: the fixture clears localStorage on every full page load.
  await foodPage.locator('a[href="/shopping-lists"]:visible').last().click();
  await expect(foodPage).toHaveURL(/\/shopping-lists/);
  await foodPage.locator('a[href="/recipes"]:visible').last().click();

  await expect.poll(() => new URL(foodPage.url()).search).toBe('?origin=mine&sort=newest');
  await expect(foodPage.locator('select').filter({ hasText: 'Neueste' }).first()).toHaveValue('newest');
  expect(recipeQueries.at(-1)).toContain('origin=mine');

  await foodPage.getByTestId('active-filters-hint').getByRole('button', { name: 'Zurücksetzen' }).click();
  await expect.poll(() => new URL(foodPage.url()).search).toBe('');
  await foodPage.locator('a[href="/shopping-lists"]:visible').last().click();
  await foodPage.locator('a[href="/recipes"]:visible').last().click();
  await expect(foodPage).toHaveURL(/\/recipes$/);
  await expect(foodPage.getByTestId('active-filters-hint')).toHaveCount(0);
});
