import { loginFoodPage, test, expect } from '../fixtures/food';
import { assertRecord, expectJsonResponse, getCsrfToken } from '../fixtures/api';

interface IngredientResponse {
  id: number;
  slug: string;
  name: string;
  description: string;
  can_edit: boolean;
  can_delete: boolean;
}

async function createIngredient(
  api: Parameters<typeof getCsrfToken>[0],
  name: string,
  description: string,
): Promise<IngredientResponse> {
  const csrf = await getCsrfToken(api);
  const response = await api.post('/api/ingredients/', {
    headers: { 'X-CSRFToken': csrf },
    data: { name, description },
  });
  const body = assertRecord(await expectJsonResponse(response));
  return {
    id: Number(body.id),
    slug: String(body.slug),
    name: String(body.name),
    description: String(body.description),
    can_edit: Boolean(body.can_edit),
    can_delete: Boolean(body.can_delete),
  };
}

test.describe('Ingredient permissions and integrity', () => {
  test('updates the description and follows server-provided permissions', async ({ browser, foodPage, api, resources, uniqueName }) => {
    const ingredient = await createIngredient(api, uniqueName('E2E Berechtigung'), 'Vorherige Beschreibung');
    resources.track({ kind: 'ingredient', slug: ingredient.slug });
    expect(ingredient.can_edit).toBe(true);
    expect(ingredient.can_delete).toBe(true);

    await foodPage.goto(`/ingredients/${ingredient.slug}`);
    await foodPage.getByTestId('ingredient-edit-button').click();
    const description = foodPage.getByPlaceholder('Optionale Beschreibung...');
    await description.fill('Persistierte Beschreibung');

    const updateRequest = foodPage.waitForRequest((request) =>
      request.method() === 'PATCH' && request.url().endsWith(`/api/ingredients/${ingredient.slug}/`),
    );
    await foodPage.getByRole('button', { name: 'Zutat speichern' }).click();
    expect((await updateRequest).postDataJSON()).toMatchObject({
      description: 'Persistierte Beschreibung',
    });
    await expect(foodPage.getByText('Zutat gespeichert')).toBeVisible();
    await foodPage.reload();
    await expect(foodPage.getByText('Persistierte Beschreibung')).toBeVisible();

    const detailResponse = await api.get(`/api/ingredients/${ingredient.slug}/`);
    const detail = assertRecord(await expectJsonResponse(detailResponse));
    expect(detail.can_edit).toBe(true);
    expect(detail.can_delete).toBe(true);

    const usersResponse = await api.get('/api/users/search/?q=user');
    const users = assertRecord(await expectJsonResponse(usersResponse));
    const otherUser = (users.items as Array<{ id: number; username: string }>).find((user) => user.username === 'user');
    expect(otherUser).toBeTruthy();
    const csrf = await getCsrfToken(api);
    const collaboratorResponse = await api.post('/api/content-collaborators/', {
      headers: { 'X-CSRFToken': csrf },
      data: {
        content_type_app: 'supply',
        content_type_model: 'ingredient',
        object_id: ingredient.id,
        user_id: otherUser?.id,
        role: 'viewer',
      },
    });
    const collaborator = assertRecord(await expectJsonResponse(collaboratorResponse));
    resources.track({ kind: 'content-collaborator', id: Number(collaborator.id) });

    const context = await browser.newContext({ baseURL: new URL(foodPage.url()).origin });
    try {
      const otherPage = await context.newPage();
      await loginFoodPage(otherPage, { email: 'user@user.de', password: 'user' });
      await otherPage.goto(`/ingredients/${ingredient.slug}`);
      await expect(otherPage.getByTestId('ingredient-edit-button')).toHaveCount(0);
      await expect(otherPage.getByTestId('ingredient-delete-button')).toHaveCount(0);

      await otherPage.goto(`/ingredients/${ingredient.slug}/edit`);
      await expect(otherPage).toHaveURL(new RegExp(`/ingredients/${ingredient.slug}$`));
      await expect(otherPage.getByRole('heading', { name: 'Zutat bearbeiten' })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('shows a German deletion conflict and keeps the referenced ingredient', async ({ foodPage, api, resources, uniqueName }) => {
    const ingredient = await createIngredient(api, uniqueName('E2E Konflikt'), 'Konflikt-Zutat');
    resources.track({ kind: 'ingredient', slug: ingredient.slug });

    const csrf = await getCsrfToken(api);
    const unitsResponse = await api.get('/api/supplies/measuring-units/');
    const units = await expectJsonResponse(unitsResponse) as Array<{ id: number; name: string }>;
    const grams = units.find((unit) => unit.name.toLowerCase() === 'gramm');
    expect(grams).toBeTruthy();

    const portionResponse = await api.post(`/api/ingredients/${ingredient.slug}/portions/`, {
      headers: { 'X-CSRFToken': csrf },
      data: {
        name: uniqueName('E2E Portion'),
        quantity: 100,
        measuring_unit_id: grams?.id,
        weight_g: 100,
      },
    });
    const portion = assertRecord(await expectJsonResponse(portionResponse));
    const recipeTitle = uniqueName('E2E Referenzrezept');
    const recipeResponse = await api.post('/api/recipes/', {
      headers: { 'X-CSRFToken': csrf },
      data: {
        title: recipeTitle,
        recipe_type: 'warm_meal',
        recipe_items: [{
          portion_id: Number(portion.id),
          quantity: 1,
          sort_order: 0,
          note: '',
          is_optional: false,
        }],
      },
    });
    const recipe = assertRecord(await expectJsonResponse(recipeResponse));
    resources.track({ kind: 'recipe', id: Number(recipe.id) });

    await foodPage.route(`**/api/ingredients/${ingredient.slug}/`, async (route) => {
      if (route.request().method() !== 'DELETE') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 409,
        json: {
          detail: 'Zutat wird noch verwendet',
          recipes: [{ title: recipeTitle }],
        },
      });
    });

    await foodPage.goto(`/ingredients/${ingredient.slug}`);
    await foodPage.getByTestId('ingredient-delete-button').click();
    const dialog = foodPage.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Löschen', exact: true }).click();

    await expect(foodPage.getByText('Zutat wird noch verwendet')).toBeVisible();
    await expect(foodPage.getByText(recipeTitle)).toBeVisible();
    await expect(foodPage.getByRole('heading', { name: ingredient.name })).toBeVisible();

    const preserved = await api.get(`/api/ingredients/${ingredient.slug}/`);
    expect(preserved.ok()).toBeTruthy();
  });
});
