import { test, expect } from '../fixtures/food';
import { assertRecord, expectJsonResponse, getCsrfToken } from '../fixtures/api';

interface PlanMeal {
  id: number;
  is_reference: boolean;
  start_datetime: string | null;
}

test.describe('Event shopping trips', () => {
  test('plan without event → event → three trips → move → create list → plan change → take over → board', async ({
    foodPage,
    api,
    resources,
    uniqueName,
  }) => {
    const csrf = await getCsrfToken(api);
    const units = (await api.get('/api/supplies/measuring-units/').then((response) => response.json())) as Array<{ id: number; name: string }>;
    const grams = units.find((unit) => unit.name.toLowerCase() === 'gramm');
    expect(grams).toBeTruthy();

    const ingredient = async (label: string) => {
      const created = assertRecord(
        await expectJsonResponse(
          await api.post('/api/ingredients/', { headers: { 'X-CSRFToken': csrf }, data: { name: uniqueName(label) } }),
        ),
      );
      resources.track({ kind: 'ingredient', slug: String(created.slug) });
      return { id: Number(created.id), name: String(created.name) };
    };
    const mince = await ingredient('E2E Hackfleisch');
    const noodles = await ingredient('E2E Nudeln');

    const planName = uniqueName('E2E Pfingstlager');
    const plan = assertRecord(
      await expectJsonResponse(
        await api.post('/api/meal-plans/', {
          headers: { 'X-CSRFToken': csrf },
          data: {
            name: planName,
            norm_portions: 10,
            reserve_factor: 1,
            start_datetime: '2026-10-23T08:00:00',
            end_datetime: '2026-10-25T20:00:00',
          },
        }),
      ),
    );
    resources.track({ kind: 'meal-plan', id: Number(plan.id) });
    const detail = assertRecord(await api.get(`/api/meal-plans/${plan.id}/`).then((response) => response.json()));
    const meals = (detail.meals as PlanMeal[])
      .filter((meal) => !meal.is_reference && meal.start_datetime)
      .sort((a, b) => String(a.start_datetime).localeCompare(String(b.start_datetime)));
    expect(meals.length).toBeGreaterThanOrEqual(2);

    const addItem = async (mealId: number, ingredientId: number, quantity: number) =>
      assertRecord(
        await expectJsonResponse(
          await api.post(`/api/meal-plans/${plan.id}/meals/${mealId}/items/`, {
            headers: { 'X-CSRFToken': csrf },
            data: { ingredient_id: ingredientId, quantity, measuring_unit_id: grams?.id, factor: 1 },
          }),
        ),
      );
    const minceItem = await addItem(meals[0].id, mince.id, 150);
    await addItem(meals[meals.length - 1].id, noodles.id, 100);

    // The plan has no event yet: the shopping tab asks for one
    await foodPage.goto(`/meal-plans/${plan.id}/shopping`);
    await expect(foodPage.getByText('Für Einkäufe braucht der Plan ein Event.')).toBeVisible();
    await foodPage.getByRole('button', { name: 'Event verknüpfen' }).click();
    const linkDialog = foodPage.getByRole('dialog', { name: 'Event verknüpfen' });
    await expect(linkDialog.getByText('Events werden geladen…')).toBeHidden();
    const newEvent = linkDialog.getByRole('button', { name: 'Neues Event anlegen' });
    if (await newEvent.isVisible()) await newEvent.click();
    await expect(linkDialog.getByLabel('Name')).toHaveValue(planName);
    const eventResponse = foodPage.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().endsWith('/api/events/'),
    );
    await linkDialog.getByRole('button', { name: 'Event anlegen' }).click();
    const event = assertRecord(await (await eventResponse).json());
    resources.track({ kind: 'event', slug: String(event.slug) });
    await foodPage.waitForURL(new RegExp(`/shopping-lists/events/${String(event.slug)}$`));

    // Three trips: before everything, the butcher on Saturday, Rewe on Sunday morning
    const addTrip = async (storeName: string, date: string, time: string) => {
      await foodPage.getByRole('button', { name: 'Einkauf hinzufügen' }).first().click();
      const dialog = foodPage.getByRole('dialog', { name: 'Einkauf hinzufügen' });
      const storeResponse = foodPage.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().endsWith('/api/shopping-stores/'),
      );
      await dialog.getByRole('combobox').fill(storeName);
      await dialog.getByRole('button', { name: `„${storeName}“ anlegen` }).click();
      resources.track({ kind: 'shopping-store', id: Number(assertRecord(await (await storeResponse).json()).id) });
      await dialog.getByLabel('Datum').fill(date);
      await dialog.getByLabel('Uhrzeit').fill(time);
      const tripResponse = foodPage.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().endsWith(`/api/shopping-events/${String(event.slug)}/trips/`),
      );
      await dialog.getByRole('button', { name: 'Hinzufügen' }).click();
      const trip = assertRecord(await (await tripResponse).json());
      resources.track({ kind: 'shopping-list', id: Number(trip.id) });
      await expect(foodPage.getByRole('article', { name: new RegExp(storeName) })).toBeVisible();
      return Number(trip.id);
    };
    const metro = uniqueName('E2E Metro');
    const butcher = uniqueName('E2E Metzger');
    const rewe = uniqueName('E2E Rewe');
    await addTrip(metro, '2026-10-22', '18:00');
    const butcherId = await addTrip(butcher, '2026-10-24', '06:00');
    await addTrip(rewe, '2026-10-25', '06:00');

    // Mince is bought at the first trip; move it to the butcher
    const metroCard = foodPage.getByRole('article', { name: new RegExp(metro) });
    await expect(metroCard.getByText(mince.name)).toBeVisible();
    await metroCard.getByRole('button', { name: `${mince.name} verschieben` }).click();
    const moveDialog = foodPage.getByRole('dialog');
    await moveDialog.getByLabel('Verschieben nach').selectOption(String(butcherId));
    await moveDialog.getByRole('button', { name: 'Verschieben' }).click();
    const butcherCard = foodPage.getByRole('article', { name: new RegExp(butcher) });
    await expect(butcherCard.getByText(mince.name)).toBeVisible();
    await expect(metroCard.getByText(mince.name)).toBeHidden();

    // Freeze the butcher trip
    await butcherCard.getByRole('button', { name: 'Liste erstellen' }).click();
    await foodPage.waitForURL(new RegExp(`/shopping-lists/${butcherId}$`));
    await expect(foodPage.getByText(mince.name, { exact: true })).toBeVisible();

    // The plan changes afterwards: the hint appears and the difference can be taken over
    const minceUpdate = await api.patch(`/api/meal-plans/${plan.id}/meal-items/${Number(minceItem.id)}/`, {
      headers: { 'X-CSRFToken': csrf },
      data: { quantity: 300 },
    });
    expect(minceUpdate.ok()).toBeTruthy();
    await foodPage.reload();
    await expect(foodPage.getByText('Essensplan wurde seit Erstellung geändert')).toBeVisible();
    await foodPage.getByRole('button', { name: 'Änderungen ansehen' }).click();
    await foodPage.getByRole('button', { name: 'Änderungen übernehmen' }).click();
    await expect(foodPage.getByText('Essensplan wurde seit Erstellung geändert')).toBeHidden();
    const list = (await api.get(`/api/shopping-lists/${butcherId}/`).then((response) => response.json())) as {
      items: Array<{ id: number; name: string; quantity_g: number }>;
    };
    expect(list.items.find((item) => item.name === mince.name)?.quantity_g).toBe(3000);

    // On the board the entry can be ticked off
    await foodPage.getByTestId('shopping-shop-mode-toggle').click();
    await foodPage.getByRole('checkbox', { name: `${mince.name} als erledigt markieren` }).click();
    await expect(foodPage.getByRole('checkbox', { name: `${mince.name} als unerledigt markieren` })).toBeVisible();
    const board = (await api.get(`/api/shopping-lists/${butcherId}/board/`).then((response) => response.json())) as { checked: number };
    expect(board.checked).toBe(1);
  });
});
