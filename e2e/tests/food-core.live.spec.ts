import { test, expect } from '../fixtures/food';

test.describe('Food core CRUD', () => {
  test('shows a non-blocking generic ingredient warning', async ({ foodPage, resources }) => {
    await foodPage.goto('/ingredients/new');
    await foodPage.getByText('Manuell', { exact: true }).first().click();
    const name = foodPage.getByPlaceholder('Name der Zutat');
    await name.fill('Nudeln');
    await expect(foodPage.getByText(/zu generisch/i)).toBeVisible();
    await foodPage.getByRole('button', { name: 'Vorschau' }).click();
    await foodPage.getByRole('button', { name: /Speichern/ }).click();
    await expect(foodPage).toHaveURL(/\/ingredients\/[^/]+$/, { timeout: 8000 });
    const slug = foodPage.url().split('/').pop();
    expect(slug).toBeTruthy();
    resources.track({ kind: 'ingredient', slug });
    await expect(foodPage.getByRole('heading', { name: 'Nudeln' })).toBeVisible();
  });

  test('creates, updates, reloads, and deletes an ingredient', async ({ foodPage, resources, uniqueName }) => {
    const name = uniqueName('E2E Zutat');

    await foodPage.goto('/ingredients/new');
    await foodPage.getByText('Manuell', { exact: true }).first().click();
    await foodPage.getByPlaceholder('Name der Zutat').fill(name);
    await foodPage.getByPlaceholder('Kurze Beschreibung (optional)').fill('E2E Beschreibung');
    await foodPage.getByRole('button', { name: 'Vorschau' }).click();
    await expect(foodPage.getByRole('heading', { name })).toBeVisible();
    await Promise.all([
      foodPage.waitForURL(/\/ingredients\/[^/]+$/),
      foodPage.getByRole('button', { name: /Speichern/ }).click(),
    ]);

    const slug = foodPage.url().split('/').pop();
    expect(slug).toBeTruthy();
    resources.track({ kind: 'ingredient', slug });
    await expect(foodPage.getByRole('heading', { name })).toBeVisible();

    await foodPage.getByTestId('ingredient-edit-button').click();
    await foodPage.getByPlaceholder('Optionale Beschreibung...').fill('E2E Beschreibung aktualisiert');
    await foodPage.getByRole('button', { name: 'Zutat speichern' }).click();
    await expect(foodPage.getByText('Zutat gespeichert')).toBeVisible();

    await foodPage.reload();
    await expect(foodPage.getByText('E2E Beschreibung aktualisiert')).toBeVisible();

    await foodPage.getByTestId('ingredient-delete-button').click();
    await foodPage.getByRole('button', { name: 'Löschen', exact: true }).click();
    await foodPage.waitForURL('**/ingredients');
    await expect(foodPage.getByText(name, { exact: true })).toHaveCount(0);
    resources.untrack('ingredient', undefined, slug);
  });

  test('adds and updates ingredient portions and packages', async ({ foodPage, resources, api, uniqueName }) => {
    const name = uniqueName('E2E Portion Zutat');
    const csrf = await api.get('/api/auth/csrf/').then((response) => response.json()).then((body) => body.csrfToken as string);
    const createdResponse = await api.post('/api/ingredients/', {
      headers: { 'X-CSRFToken': csrf },
      data: { name, description: 'Portion fixture' },
    });
    expect(createdResponse.ok()).toBeTruthy();
    const created = await createdResponse.json() as { slug: string };
    resources.track({ kind: 'ingredient', slug: created.slug });

    await foodPage.goto(`/ingredients/${created.slug}`);
    await foodPage.getByRole('button', { name: 'Portion hinzufügen' }).click();
    await foodPage.getByPlaceholder('Portionsname (z.B. Tasse, EL)').fill('E2E Tasse');
    await foodPage.locator('select').last().selectOption({ label: 'Gramm' });
    await foodPage.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await expect(foodPage.getByText('E2E Tasse', { exact: true })).toBeVisible();

    await foodPage.getByRole('button', { name: 'Packung hinzufügen' }).click();
    await foodPage.getByPlaceholder('Name (z.B. 500g Packung)').fill('E2E Packung');
    await foodPage.getByPlaceholder('Gewicht (g)').fill('500');
    await foodPage.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
    await expect(foodPage.getByText('E2E Packung', { exact: true })).toBeVisible();
  });

  test('creates, updates, reloads, and deletes a shopping list', async ({ foodPage, resources, uniqueName }) => {
    const name = uniqueName('E2E Einkauf');

    await foodPage.setViewportSize({ width: 768, height: 1024 });
    await foodPage.goto('/shopping-lists');
    await foodPage.getByRole('button', { name: /Neue Liste erstellen|Neue Liste/ }).first().click();
    await foodPage.getByPlaceholder('Name der Einkaufsliste').fill(name);
    await foodPage.getByRole('button', { name: 'Erstellen', exact: true }).click();
    await foodPage.waitForURL(/\/shopping-lists\/\d+$/);

    const id = Number(foodPage.url().split('/').pop());
    resources.track({ kind: 'shopping-list', id });
    await expect(foodPage.getByRole('heading', { name })).toBeVisible();
    await foodPage.getByRole('button', { name: 'Eintrag hinzufügen' }).click();
    await foodPage.getByPlaceholder('Neuer Eintrag...').fill('Tomaten');
    await foodPage.getByRole('button', { name: 'Hinzufügen' }).click();
    await expect(foodPage.getByText('Tomaten', { exact: true })).toBeVisible();

    const item = foodPage.getByText('Tomaten', { exact: true }).locator('xpath=ancestor::div[starts-with(@data-testid,"shopping-item-")][1]');
    await item.getByRole('button', { name: 'Als erledigt markieren' }).click();
    await expect(foodPage.getByText('1 / 1 erledigt')).toBeVisible();
    await expect(foodPage.getByText('100%')).toBeVisible();

    await foodPage.getByRole('heading', { name }).click();
    await foodPage.getByTestId('shopping-list-name-input').fill(`${name} aktualisiert`);
    await Promise.all([
      foodPage.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().includes(`/api/shopping-lists/${id}/`)),
      foodPage.getByRole('button', { name: 'OK' }).click(),
    ]);
    await foodPage.reload();
    await expect(foodPage.getByRole('heading', { name: `${name} aktualisiert` })).toBeVisible();

    await foodPage.getByRole('button', { name: 'Einkaufsliste löschen' }).click();
    await foodPage.getByRole('button', { name: 'Löschen', exact: true }).click();
    await foodPage.waitForURL('**/shopping-lists');
    await expect(foodPage.getByText(`${name} aktualisiert`, { exact: true })).toHaveCount(0);
  });

});
