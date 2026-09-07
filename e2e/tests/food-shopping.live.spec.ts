import { loginFoodPage, test, expect } from '../fixtures/food';
import { assertRecord, expectJsonResponse, getCsrfToken } from '../fixtures/api';

interface ShoppingListDetail {
  id: number;
  name: string;
  owner_id: number;
  can_edit: boolean;
  is_owner: boolean;
  items: Array<{
    id: number;
    name: string;
    quantity_g: number;
    is_checked: boolean;
    sources: Array<{
      recipe_name: string;
      recipe_slug: string;
      meal_label: string;
      quantity_g: number;
    }>;
  }>;
  collaborators: Array<{ id: number; user_id: number; role: string }>;
}

interface UserSummary {
  id: number;
  username: string;
}

async function createShoppingList(
  api: Parameters<typeof getCsrfToken>[0],
  name: string,
): Promise<ShoppingListDetail> {
  const csrf = await getCsrfToken(api);
  const response = await api.post('/api/shopping-lists/', {
    headers: { 'X-CSRFToken': csrf },
    data: { name },
  });
  const body = assertRecord(await expectJsonResponse(response));
  return {
    id: Number(body.id),
    name: String(body.name),
    owner_id: Number(body.owner_id),
    can_edit: Boolean(body.can_edit),
    is_owner: true,
    items: [],
    collaborators: [],
  };
}

async function getShoppingList(
  api: Parameters<typeof getCsrfToken>[0],
  id: number,
): Promise<ShoppingListDetail> {
  const response = await api.get(`/api/shopping-lists/${id}/`);
  return await expectJsonResponse(response) as ShoppingListDetail;
}

async function addShoppingItem(
  api: Parameters<typeof getCsrfToken>[0],
  listId: number,
  name: string,
  quantity_g = 0,
): Promise<number> {
  const csrf = await getCsrfToken(api);
  const response = await api.post(`/api/shopping-lists/${listId}/items/`, {
    headers: { 'X-CSRFToken': csrf },
    data: { name, quantity_g, unit: 'g' },
  });
  const body = assertRecord(await expectJsonResponse(response));
  return Number(body.id);
}

async function getUsers(api: Parameters<typeof getCsrfToken>[0]): Promise<UserSummary[]> {
  const response = await api.get('/api/shopping-lists/users/?page_size=50');
  const body = assertRecord(await expectJsonResponse(response));
  return body.items as UserSummary[];
}

test.describe('Shopping list permissions and persistence', () => {
  test('rolls back a failed optimistic check and shows German feedback', async ({ foodPage, api, resources, uniqueName }) => {
    const list = await createShoppingList(api, uniqueName('E2E Rollback Liste'));
    resources.track({ kind: 'shopping-list', id: list.id });
    await addShoppingItem(api, list.id, uniqueName('E2E Rollback Eintrag'));

    await foodPage.route(`**/api/shopping-lists/${list.id}/items/*/`, async (route) => {
      if (route.request().method() !== 'PATCH') {
        await route.continue();
        return;
      }
      await route.fulfill({ status: 503, json: { detail: 'Der Eintrag konnte nicht gespeichert werden.' } });
    });

    await foodPage.goto(`/shopping-lists/${list.id}`);
    const checkbox = foodPage.getByTestId(/^shopping-item-/).getByRole('button', { name: 'Als erledigt markieren' }).first();
    await checkbox.click();
    await expect(checkbox).toHaveClass(/border-muted-foreground/);
    await expect(foodPage.getByText('Fehler beim Abhaken')).toBeVisible();
    await expect(foodPage.getByText('Der Eintrag konnte nicht gespeichert werden.')).toBeVisible();
    await expect(foodPage.getByText('0 / 1 erledigt')).toBeVisible();
  });

  test('shows owner, admin, editor, and viewer controls from server permissions', async ({ browser, foodPage, api, resources, uniqueName }) => {
    const list = await createShoppingList(api, uniqueName('E2E Rollen Liste'));
    resources.track({ kind: 'shopping-list', id: list.id });
    await addShoppingItem(api, list.id, uniqueName('E2E Rollen Eintrag'));
    const users = await getUsers(api);
    const roleCredentials = [
      { username: 'user', role: 'admin', email: 'user@user.de', password: 'user' },
      { username: 'author1', role: 'editor', email: 'author1@author1.de', password: 'author1' },
      { username: 'seed_user', role: 'viewer', email: 'seed@example.com', password: 'seed_user' },
    ] as const;
    for (const credentials of roleCredentials) {
      expect(users.find((user) => user.username === credentials.username)).toBeTruthy();
    }

    const csrf = await getCsrfToken(api);
    for (const credentials of roleCredentials) {
      const roleUser = users.find((user) => user.username === credentials.username);
      const response = await api.post(`/api/shopping-lists/${list.id}/collaborators/`, {
        headers: { 'X-CSRFToken': csrf },
        data: { user_id: roleUser?.id, role: credentials.role },
      });
      await expectJsonResponse(response);
    }

    await foodPage.goto(`/shopping-lists/${list.id}`);
    await expect(foodPage.getByRole('button', { name: 'Eintrag hinzufügen' })).toBeVisible();
    await expect(foodPage.getByRole('button', { name: 'Einkaufsliste löschen' })).toBeVisible();
    await foodPage.getByRole('button', { name: `Mitglieder (${roleCredentials.length})` }).click();
    await expect(foodPage.getByRole('button', { name: 'Nutzer einladen' })).toBeVisible();

    const baseURL = new URL(foodPage.url()).origin;
    for (const credentials of roleCredentials) {
      const user = users.find((candidate) => candidate.username === credentials.username);
      expect(user).toBeTruthy();
      const context = await browser.newContext({ baseURL });
      await context.routeWebSocket(/\/ws\/shopping-lists\/\d+\/$/, (webSocket) => {
        void webSocket.close({ code: 1000, reason: 'REST-only E2E test boundary' });
      });
      try {
        const rolePage = await context.newPage();
        await loginFoodPage(rolePage, {
          email: credentials.email,
          password: credentials.password,
        });
        await rolePage.goto(`/shopping-lists/${list.id}`);
        await expect(rolePage.getByRole('heading', { name: list.name })).toBeVisible();
        await expect(rolePage.getByRole('button', { name: 'Einkaufsliste löschen' })).toHaveCount(0);

        const roleCsrf = await getCsrfToken(rolePage.request);
        const renameResponse = await rolePage.request.patch(`/api/shopping-lists/${list.id}/`, {
          headers: { 'X-CSRFToken': roleCsrf },
          data: { name: list.name },
        });
        expect(renameResponse.status()).toBe(credentials.role === 'admin' ? 200 : 403);
        const itemResponse = await rolePage.request.post(`/api/shopping-lists/${list.id}/items/`, {
          headers: { 'X-CSRFToken': roleCsrf },
          data: { name: `Rollen-Eintrag-${credentials.role}` },
        });
        expect(itemResponse.status()).toBe(credentials.role === 'viewer' ? 403 : 200);
        const deleteResponse = await rolePage.request.delete(`/api/shopping-lists/${list.id}/`, {
          headers: { 'X-CSRFToken': roleCsrf },
        });
        expect(deleteResponse.status()).toBe(403);

        const invitee = users.find((candidate) =>
          candidate.id !== list.owner_id
          && !roleCredentials.some((roleCredential) => roleCredential.username === candidate.username),
        );
        const collaboratorResponse = await rolePage.request.post(`/api/shopping-lists/${list.id}/collaborators/`, {
          headers: { 'X-CSRFToken': roleCsrf },
          data: { user_id: invitee?.id, role: 'viewer' },
        });
        expect(collaboratorResponse.status()).toBe(credentials.role === 'admin' ? 200 : 403);

        if (credentials.role === 'viewer') {
          await expect(rolePage.getByRole('button', { name: 'Eintrag hinzufügen' })).toHaveCount(0);
          await expect(rolePage.getByRole('button', { name: 'Als erledigt markieren' }).first()).toBeDisabled();
          await expect(rolePage.getByRole('button', { name: 'Nutzer einladen' })).toHaveCount(0);
        } else {
          await expect(rolePage.getByRole('button', { name: 'Eintrag hinzufügen' })).toBeVisible();
          await expect(rolePage.getByRole('button', { name: 'Als erledigt markieren' }).first()).toBeEnabled();
        }

        if (credentials.role === 'admin') {
          await rolePage.getByRole('heading', { name: list.name }).click();
          await expect(rolePage.getByTestId('shopping-list-name-input')).toBeVisible();
          await rolePage.getByTestId('shopping-list-name-input').press('Escape');
          await rolePage.getByRole('button', { name: /Mitglieder \(\d+\)/ }).click();
          await expect(rolePage.getByRole('button', { name: 'Nutzer einladen' })).toBeVisible();
        } else {
          await expect(rolePage.getByRole('button', { name: 'Nutzer einladen' })).toHaveCount(0);
          await expect(rolePage.getByRole('heading', { name: list.name })).not.toHaveAttribute('title', 'Klicken zum Bearbeiten');
        }
      } finally {
        await context.close();
      }
    }

    const detail = await getShoppingList(api, list.id);
    expect(detail.can_edit).toBe(true);
    expect(detail.is_owner).toBe(true);
    expect(detail.collaborators.length).toBeGreaterThanOrEqual(roleCredentials.length);
  });

  test('exports scaled recipe ingredients with persisted provenance', async ({ foodPage, api, resources, uniqueName }) => {
    const csrf = await getCsrfToken(api);
    const ingredientResponse = await api.post('/api/ingredients/', {
      headers: { 'X-CSRFToken': csrf },
      data: { name: uniqueName('E2E Export Zutat'), description: 'Export fixture' },
    });
    const ingredient = assertRecord(await expectJsonResponse(ingredientResponse));
    resources.track({ kind: 'ingredient', slug: String(ingredient.slug) });

    const units = await api.get('/api/supplies/measuring-units/').then((response) => response.json()) as Array<{ id: number; name: string }>;
    const grams = units.find((unit) => unit.name.toLowerCase() === 'gramm');
    expect(grams).toBeTruthy();
    const portionResponse = await api.post(`/api/ingredients/${ingredient.slug}/portions/`, {
      headers: { 'X-CSRFToken': csrf },
      data: { name: uniqueName('E2E 100g Portion'), quantity: 100, measuring_unit_id: grams?.id, weight_g: 100 },
    });
    const portion = assertRecord(await expectJsonResponse(portionResponse));

    const recipeTitle = uniqueName('E2E Export Rezept');
    const recipeResponse = await api.post('/api/recipes/', {
      headers: { 'X-CSRFToken': csrf },
      data: {
        title: recipeTitle,
        recipe_type: 'warm_meal',
        portions: 1,
        recipe_items: [{ portion_id: Number(portion.id), quantity: 2, sort_order: 0, note: '', is_optional: false }],
      },
    });
    const recipeBody = assertRecord(await expectJsonResponse(recipeResponse));
    const recipe = {
      id: Number(recipeBody.id),
      slug: String(recipeBody.slug),
      title: recipeTitle,
    };
    resources.track({ kind: 'recipe', id: recipe.id });

    await foodPage.goto(`/recipes/${recipe.slug}`);
    await foodPage.locator('button[aria-label="Einkaufsliste erstellen"]:visible').click({ force: true });
    const exportDialog = foodPage.getByTestId('recipe-shopping-export-dialog');
    await exportDialog.getByTestId('recipe-shopping-export-portions').fill('3');
    const exportRequest = foodPage.waitForRequest((request) =>
      request.method() === 'POST' && request.url().endsWith(`/api/shopping-lists/from-recipe/${recipe.id}/`),
    );
    await exportDialog.getByTestId('recipe-shopping-export-submit').click();
    expect((await exportRequest).postDataJSON()).toEqual({ portions: 3 });
    await foodPage.waitForURL(/\/shopping-lists\/\d+$/);

    const exportedId = Number(foodPage.url().split('/').pop());
    resources.track({ kind: 'shopping-list', id: exportedId });
    const exported = await getShoppingList(api, exportedId);
    expect(exported.items).toHaveLength(1);
    expect(exported.items[0]?.quantity_g).toBe(600);
    expect(exported.items[0]?.sources[0]).toMatchObject({
      recipe_name: recipe.title,
      recipe_slug: recipe.slug,
      quantity_g: 600,
    });
    await foodPage.reload();
    const exportedIngredient = String(ingredient.name);
    await foodPage.getByText(exportedIngredient, { exact: true }).locator('..').locator('..').click();
    await expect(foodPage.getByText(recipe.title, { exact: true })).toBeVisible();
  });

  test('exports real meal ingredients and excludes reference-meal templates', async ({ api, resources, uniqueName }) => {
    const csrf = await getCsrfToken(api);
    const units = await api.get('/api/supplies/measuring-units/').then((response) => response.json()) as Array<{ id: number; name: string }>;
    const grams = units.find((unit) => unit.name.toLowerCase() === 'gramm');
    expect(grams).toBeTruthy();

    const recipeIngredientResponse = await api.post('/api/ingredients/', {
      headers: { 'X-CSRFToken': csrf },
      data: { name: uniqueName('E2E MealPlan Rezeptzutat') },
    });
    const recipeIngredient = assertRecord(await expectJsonResponse(recipeIngredientResponse));
    resources.track({ kind: 'ingredient', slug: String(recipeIngredient.slug) });
    const directIngredientResponse = await api.post('/api/ingredients/', {
      headers: { 'X-CSRFToken': csrf },
      data: { name: uniqueName('E2E MealPlan Direktzutat') },
    });
    const directIngredient = assertRecord(await expectJsonResponse(directIngredientResponse));
    resources.track({ kind: 'ingredient', slug: String(directIngredient.slug) });

    const recipePortionResponse = await api.post(`/api/ingredients/${recipeIngredient.slug}/portions/`, {
      headers: { 'X-CSRFToken': csrf },
      data: { name: uniqueName('E2E 100g MealPlan Portion'), quantity: 100, measuring_unit_id: grams?.id, weight_g: 100 },
    });
    const recipePortion = assertRecord(await expectJsonResponse(recipePortionResponse));
    const recipeTitle = uniqueName('E2E MealPlan Export Rezept');
    const recipeResponse = await api.post('/api/recipes/', {
      headers: { 'X-CSRFToken': csrf },
      data: {
        title: recipeTitle,
        recipe_type: 'warm_meal',
        portions: 1,
        recipe_items: [{ portion_id: Number(recipePortion.id), quantity: 2, sort_order: 0, note: '', is_optional: false }],
      },
    });
    const recipeBody = assertRecord(await expectJsonResponse(recipeResponse));
    const recipe = {
      id: Number(recipeBody.id),
      title: recipeTitle,
    };
    resources.track({ kind: 'recipe', id: recipe.id });

    const planResponse = await api.post('/api/meal-plans/', {
      headers: { 'X-CSRFToken': csrf },
      data: {
        name: uniqueName('E2E MealPlan Export'),
        norm_portions: 2,
        reserve_factor: 1,
        start_datetime: '2026-09-07T08:00:00',
        end_datetime: '2026-09-07T20:00:00',
      },
    });
    const plan = assertRecord(await expectJsonResponse(planResponse));
    resources.track({ kind: 'meal-plan', id: Number(plan.id) });
    const planDetail = assertRecord(await api.get(`/api/meal-plans/${plan.id}/`).then((response) => response.json()));
    const realMeal = (planDetail.meals as Array<{ id: number; is_reference: boolean }>).find((meal) => !meal.is_reference);
    expect(realMeal).toBeTruthy();

    const recipeItemResponse = await api.post(`/api/meal-plans/${plan.id}/meals/${realMeal?.id}/items/`, {
      headers: { 'X-CSRFToken': csrf },
      data: { recipe_id: recipe.id, factor: 1 },
    });
    expect(recipeItemResponse.ok()).toBeTruthy();
    const directItemResponse = await api.post(`/api/meal-plans/${plan.id}/meals/${realMeal?.id}/items/`, {
      headers: { 'X-CSRFToken': csrf },
      data: { ingredient_id: Number(directIngredient.id), quantity: 150, measuring_unit_id: grams?.id, factor: 1 },
    });
    expect(directItemResponse.ok()).toBeTruthy();

    const refResponse = await api.post(`/api/meal-plans/${plan.id}/ref-meals/`, {
      headers: { 'X-CSRFToken': csrf },
      data: { meal_type: 'snack', items: [{ recipe_id: recipe.id, factor: 1 }] },
    });
    expect(refResponse.ok()).toBeTruthy();

    const exportResponse = await api.post(`/api/shopping-lists/from-meal-plan/${plan.id}/`, {
      headers: { 'X-CSRFToken': csrf },
      data: {},
    });
    const exported = await expectJsonResponse(exportResponse) as ShoppingListDetail;
    resources.track({ kind: 'shopping-list', id: exported.id });
    expect(exported.items.map((item) => item.name).sort()).toEqual([
      recipeIngredient.name,
      directIngredient.name,
    ].sort());
    const recipeSources = exported.items.flatMap((item) => item.sources).filter((source) => source.recipe_name === recipe.title);
    expect(recipeSources).toHaveLength(1);
    expect(recipeSources[0]?.quantity_g).toBe(400);
    expect(exported.items.find((item) => item.name === directIngredient.name)?.sources[0]).toMatchObject({
      recipe_name: 'Direkte Zutat',
      recipe_slug: '',
      quantity_g: 300,
    });
  });

  test('uses URL search and pagination while sort and owner filters remain local', async ({ foodPage, api, resources, uniqueName }) => {
    const names = [
      uniqueName('E2E Suche Alpha'),
      uniqueName('E2E Suche Beta'),
      ...Array.from({ length: 20 }, (_, index) => uniqueName(`E2E Suche Extra ${index}`)),
    ];
    for (const name of names) {
      const list = await createShoppingList(api, name);
      resources.track({ kind: 'shopping-list', id: list.id });
    }

    await foodPage.goto('/shopping-lists');
    const search = foodPage.getByPlaceholder('Einkaufsliste suchen...');
    await search.fill('E2E Suche Alpha');
    await expect.poll(() => new URL(foodPage.url()).searchParams.get('q')).toBe('E2E Suche Alpha');
    await expect(foodPage.getByText(names[0], { exact: true })).toBeVisible();
    await foodPage.reload();
    await expect(search).toHaveValue('E2E Suche Alpha');
    await expect(foodPage.getByText(names[0], { exact: true })).toBeVisible();

    await foodPage.getByRole('combobox').selectOption('name_asc');
    expect(new URL(foodPage.url()).searchParams.get('sort')).toBeNull();
    await foodPage.getByRole('button', { name: 'Meine Daten' }).click();
    expect(new URL(foodPage.url()).searchParams.get('owner')).toBeNull();

    const pageResponse = foodPage.waitForResponse((response) =>
      response.url().includes('/api/shopping-lists/') && response.url().includes('page=2'),
    );
    await foodPage.goto('/shopping-lists?q=E2E%20Suche&page=2');
    await pageResponse;
    await expect.poll(() => new URL(foodPage.url()).searchParams.get('page')).toBe('2');
  });
});
