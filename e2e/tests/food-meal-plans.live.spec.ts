import { test, expect } from '../fixtures/food';
import { assertRecord, expectJsonResponse, getCsrfToken } from '../fixtures/api';
import type { Locator, Page } from '@playwright/test';

type FoodApi = Parameters<typeof getCsrfToken>[0];

interface MealPlanSetup {
  id: number;
  name: string;
}

const PLAN_START = '2026-09-07T06:00';
const PLAN_END = '2026-09-07T22:00';

const CUSTOM_MEAL_TIMES = {
  breakfast: ['06:30', '07:15'],
  lunch: ['12:15', '13:00'],
  dinner: ['18:30', '19:30'],
  snack: ['15:20', '15:40'],
};

function recordArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) throw new Error('Expected an array response');
  return value.map(assertRecord);
}

async function createMealPlan(
  api: FoodApi,
  name: string,
  options: Record<string, unknown> = {},
): Promise<MealPlanSetup> {
  const csrf = await getCsrfToken(api);
  const response = await api.post('/api/meal-plans/', {
    headers: { 'X-CSRFToken': csrf },
    data: {
      name,
      norm_portions: 10,
      reserve_factor: 1,
      start_datetime: `${PLAN_START}:00`,
      end_datetime: `${PLAN_END}:00`,
      ...options,
    },
  });
  const body = assertRecord(await expectJsonResponse(response));
  if (typeof body.id !== 'number' || typeof body.name !== 'string') {
    throw new Error('MealPlan creation returned an invalid response');
  }
  return { id: body.id, name: body.name };
}

async function getMealPlan(api: FoodApi, planId: number): Promise<Record<string, unknown>> {
  return assertRecord(await expectJsonResponse(await api.get(`/api/meal-plans/${planId}/`)));
}

async function createEvent(api: FoodApi, name: string): Promise<string> {
  const csrf = await getCsrfToken(api);
  const response = await api.post('/api/events/', {
    headers: { 'X-CSRFToken': csrf },
    data: {
      name,
      description: 'Deterministisches MealPlan-E2E-Event',
      start_date: `${PLAN_START}:00`,
      end_date: `${PLAN_END}:00`,
      is_public: false,
    },
  });
  const body = assertRecord(await expectJsonResponse(response));
  if (typeof body.slug !== 'string') throw new Error('Event creation returned no slug');
  return body.slug;
}

async function addGroupMember(api: FoodApi, planId: number, name: string): Promise<void> {
  const csrf = await getCsrfToken(api);
  const response = await api.post(`/api/meal-plans/${planId}/group-members/`, {
    headers: { 'X-CSRFToken': csrf },
    data: {
      name,
      age: 15,
      gender: 'no_answer',
      nutritional_tag_ids: [],
    },
  });
  await expectJsonResponse(response);
}

async function openSettings(foodPage: Page): Promise<Locator> {
  await foodPage.getByRole('button', { name: 'Einstellungen' }).click();
  return foodPage.getByRole('dialog');
}

async function setMealTimes(
  container: Locator,
  times: Record<string, string[]>,
): Promise<void> {
  for (const [mealType, values] of Object.entries(times)) {
    const inputs = container.getByTestId(`meal-time-group-${mealType}`).locator('input[type="time"]');
    await inputs.nth(0).fill(values[0] ?? '');
    await inputs.nth(1).fill(values[1] ?? '');
  }
}

async function captureWindowOpen(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = window as Window & { __e2eOpenedUrl?: string };
    state.__e2eOpenedUrl = undefined;
    window.open = ((url?: string | URL) => {
      state.__e2eOpenedUrl = String(url ?? '');
      return null;
    }) as typeof window.open;
  });
}

async function expectOpenedUrl(page: Page, pattern: RegExp): Promise<void> {
  await expect.poll(() => page.evaluate(() => (window as Window & { __e2eOpenedUrl?: string }).__e2eOpenedUrl ?? '')).toMatch(pattern);
}

test.describe('MealPlan persistence and controls', () => {
  test('creates an empty plan through the wizard and persists settings after reload', async ({ foodPage, api, resources, uniqueName }) => {
    const name = uniqueName('E2E Leerer Essensplan');
    const updatedName = `${name} aktualisiert`;

    await foodPage.goto('/meal-plans/new');
    await foodPage.getByPlaceholder('z.B. Sommerlager 2026').fill(name);
    await foodPage.locator('input[type="number"]').first().fill('7');
    const datetimeInputs = foodPage.locator('input[type="datetime-local"]');
    await datetimeInputs.nth(0).fill(PLAN_START);
    await datetimeInputs.nth(1).fill(PLAN_END);
    await foodPage.getByRole('button', { name: 'Weiter', exact: true }).click();
    await foodPage.getByRole('button', { name: 'Leeren Plan erstellen' }).click();
    await foodPage.getByRole('button', { name: 'Weiter', exact: true }).click();

    const createRequest = foodPage.waitForRequest((request) =>
      request.method() === 'POST' && request.url().endsWith('/api/meal-plans/'),
    );
    await foodPage.getByRole('button', { name: 'Essensplan erstellen', exact: true }).click();
    const createBody = assertRecord((await createRequest).postDataJSON());
    expect(createBody).toMatchObject({
      name,
      norm_portions: 7,
      start_datetime: `${PLAN_START}:00`,
      end_datetime: `${PLAN_END}:00`,
    });
    await foodPage.waitForURL(/\/meal-plans\/\d+\/plan$/);

    const planId = Number(foodPage.url().match(/meal-plans\/(\d+)/)?.[1]);
    expect(planId).toBeGreaterThan(0);
    resources.track({ kind: 'meal-plan', id: planId });
    await expect(foodPage.getByRole('heading', { name })).toBeVisible();
    await expect(foodPage.getByText('7.0 Portionen', { exact: true })).toBeVisible();

    const settings = await openSettings(foodPage);
    await settings.locator('input[type="text"]').first().fill(updatedName);
    await settings.locator('#norm-portions-input').fill('9');
    const updateResponse = foodPage.waitForResponse((response) =>
      response.request().method() === 'PATCH' && response.url().endsWith(`/api/meal-plans/${planId}/`),
    );
    await settings.getByRole('button', { name: 'Speichern', exact: true }).click();
    await updateResponse;
    await expect(settings).toBeHidden();

    const updated = await getMealPlan(api, planId);
    expect(updated.name).toBe(updatedName);
    expect(updated.norm_portions).toBe(9);
    await foodPage.reload();
    await expect(foodPage.getByRole('heading', { name: updatedName })).toBeVisible();
    await expect(foodPage.getByText('9.0 Portionen', { exact: true })).toBeVisible();
  });

  test('persists custom default meal times and applies them to a new meal', async ({ foodPage, api, resources, uniqueName }) => {
    const name = uniqueName('E2E Eigene Mahlzeitenzeiten');

    await foodPage.goto('/meal-plans/new');
    await foodPage.getByPlaceholder('z.B. Sommerlager 2026').fill(name);
    await foodPage.getByRole('button', { name: 'Erweiterte Einstellungen anzeigen', exact: true }).click();
    const wizardSettings = foodPage.locator('[data-testid="meal-time-group-breakfast"]').locator('..').locator('..');
    await setMealTimes(wizardSettings, CUSTOM_MEAL_TIMES);
    const datetimeInputs = foodPage.locator('input[type="datetime-local"]');
    await datetimeInputs.nth(0).fill(PLAN_START);
    await datetimeInputs.nth(1).fill(PLAN_END);
    await foodPage.getByRole('button', { name: 'Weiter', exact: true }).click();
    await foodPage.getByRole('button', { name: 'Leeren Plan erstellen' }).click();
    await foodPage.getByRole('button', { name: 'Weiter', exact: true }).click();

    const createRequest = foodPage.waitForRequest((request) =>
      request.method() === 'POST' && request.url().endsWith('/api/meal-plans/'),
    );
    await foodPage.getByRole('button', { name: 'Essensplan erstellen', exact: true }).click();
    const createBody = assertRecord((await createRequest).postDataJSON());
    expect(createBody.meal_default_times).toEqual(CUSTOM_MEAL_TIMES);
    await foodPage.waitForURL(/\/meal-plans\/\d+\/plan$/);

    const planId = Number(foodPage.url().match(/meal-plans\/(\d+)/)?.[1]);
    expect(planId).toBeGreaterThan(0);
    resources.track({ kind: 'meal-plan', id: planId });
    const created = await getMealPlan(api, planId);
    expect(created.meal_default_times).toEqual(CUSTOM_MEAL_TIMES);

    const addMealRequest = foodPage.waitForRequest((request) =>
      request.method() === 'POST' && request.url().endsWith(`/api/meal-plans/${planId}/meals/`),
    );
    await foodPage.getByRole('button', { name: 'Snack', exact: true }).click();
    const addMealBody = assertRecord((await addMealRequest).postDataJSON());
    expect(addMealBody).toMatchObject({
      start_datetime: `2026-09-07T${CUSTOM_MEAL_TIMES.snack[0]}:00`,
      end_datetime: `2026-09-07T${CUSTOM_MEAL_TIMES.snack[1]}:00`,
      meal_type: 'snack',
    });
    await foodPage.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

    const settings = await openSettings(foodPage);
    const settingsTimes = {
      ...CUSTOM_MEAL_TIMES,
      lunch: ['12:30', '13:15'],
    };
    await setMealTimes(settings, settingsTimes);
    const updateRequest = foodPage.waitForRequest((request) =>
      request.method() === 'PATCH' && request.url().endsWith(`/api/meal-plans/${planId}/`),
    );
    await settings.getByRole('button', { name: 'Speichern', exact: true }).click();
    const updateBody = assertRecord((await updateRequest).postDataJSON());
    expect(updateBody.meal_default_times).toEqual(settingsTimes);
    await expect(settings).toBeHidden();
    await foodPage.reload();
    const reloadedSettings = await openSettings(foodPage);
    const lunchInputs = reloadedSettings.getByTestId('meal-time-group-lunch').locator('input[type="time"]');
    await expect(lunchInputs.nth(0)).toHaveValue('12:30');
    await expect(lunchInputs.nth(1)).toHaveValue('13:15');
  });

  test('keeps event-linked manual norm portions stable and restores automatic mode', async ({ foodPage, api, resources, uniqueName }) => {
    const eventSlug = await createEvent(api, uniqueName('E2E Normportionen Event'));
    resources.track({ kind: 'event', slug: eventSlug });
    const eventResponse = await api.get(`/api/events/${eventSlug}/`);
    const event = assertRecord(await expectJsonResponse(eventResponse));
    const eventId = event.id;
    expect(typeof eventId).toBe('number');

    const plan = await createMealPlan(api, uniqueName('E2E Event Essensplan'), {
      event_id: eventId,
    });
    resources.track({ kind: 'meal-plan', id: plan.id });
    await addGroupMember(api, plan.id, uniqueName('E2E Event Person'));

    await foodPage.goto(`/meal-plans/${plan.id}/plan`);
    const settings = await openSettings(foodPage);
    const manualSwitch = settings.getByRole('switch', { name: 'Normportionen manuell festlegen' });
    await expect(manualSwitch).toBeVisible();
    await expect(settings.getByText('Automatisch berechnet', { exact: true })).toBeVisible();
    await manualSwitch.click();

    const manualInput = settings.getByLabel('Manuelle Normportionen');
    await manualInput.fill('17.5');
    await expect(settings.getByText('Bitte eine positive ganze Zahl eingeben.', { exact: true })).toBeVisible();
    await expect(settings.getByRole('button', { name: 'Speichern', exact: true })).toBeDisabled();
    await manualInput.fill('17');

    const manualUpdate = foodPage.waitForRequest((request) =>
      request.method() === 'PATCH' && request.url().endsWith(`/api/meal-plans/${plan.id}/`),
    );
    await settings.getByRole('button', { name: 'Speichern', exact: true }).click();
    const manualBody = assertRecord((await manualUpdate).postDataJSON());
    expect(manualBody).toMatchObject({ norm_portions: 17, norm_portions_manual: true });
    await expect(settings).toBeHidden();

    let detail = await getMealPlan(api, plan.id);
    expect(detail.norm_portions_manual).toBe(true);
    expect(detail.norm_portions).toBe(17);

    await addGroupMember(api, plan.id, uniqueName('E2E Event Person Zweit'));
    const activityCsrf = await getCsrfToken(api);
    const activityResponse = await api.patch(`/api/meal-plans/${plan.id}/`, {
      headers: { 'X-CSRFToken': activityCsrf },
      data: { activity_factor: 2 },
    });
    await expectJsonResponse(activityResponse);
    detail = await getMealPlan(api, plan.id);
    expect(detail.norm_portions_manual).toBe(true);
    expect(detail.norm_portions).toBe(17);
    expect(detail.activity_factor).toBe(2);

    await foodPage.reload();
    const stableSettings = await openSettings(foodPage);
    await expect(stableSettings.getByRole('switch', { name: 'Normportionen manuell festlegen' })).toHaveAttribute('data-state', 'checked');
    await expect(stableSettings.getByLabel('Manuelle Normportionen')).toHaveValue('17');
    await stableSettings.getByRole('switch', { name: 'Normportionen manuell festlegen' }).click();
    await expect(stableSettings.getByText('Automatisch berechnet', { exact: true })).toBeVisible();

    const automaticUpdate = foodPage.waitForResponse((response) =>
      response.request().method() === 'PATCH' && response.url().endsWith(`/api/meal-plans/${plan.id}/`),
    );
    await stableSettings.getByRole('button', { name: 'Speichern', exact: true }).click();
    await automaticUpdate;
    detail = await getMealPlan(api, plan.id);
    expect(detail.norm_portions_manual).toBe(false);
    expect(detail.norm_portions).not.toBe(17);
  });

  test('keeps standalone plans on direct portions and hides event-only manual controls', async ({ foodPage, api, resources, uniqueName }) => {
    const plan = await createMealPlan(api, uniqueName('E2E Standalone Essensplan'));
    resources.track({ kind: 'meal-plan', id: plan.id });

    await foodPage.goto(`/meal-plans/${plan.id}/plan`);
    const settings = await openSettings(foodPage);
    await expect(settings.getByRole('switch', { name: 'Normportionen manuell festlegen' })).toHaveCount(0);
    await expect(settings.getByText('Manuell festgelegt', { exact: true })).toHaveCount(0);
    const portions = settings.locator('#norm-portions-input');
    await expect(portions).toBeVisible();
    await portions.fill('13');

    const updateRequest = foodPage.waitForRequest((request) =>
      request.method() === 'PATCH' && request.url().endsWith(`/api/meal-plans/${plan.id}/`),
    );
    await settings.getByRole('button', { name: 'Speichern', exact: true }).click();
    const updateBody = assertRecord((await updateRequest).postDataJSON());
    expect(updateBody.norm_portions).toBe(13);
    expect(updateBody).not.toHaveProperty('norm_portions_manual');
    await expect(settings).toBeHidden();
    await foodPage.reload();
    await expect(foodPage.getByText('13.0 Portionen', { exact: true })).toBeVisible();
  });

  test('covers MealPlan day and meal mutations plus detail tabs and PDF routes', async ({ foodPage, api, resources, uniqueName }) => {
    const plan = await createMealPlan(api, uniqueName('E2E MealPlan Detail'), {
      meal_default_times: CUSTOM_MEAL_TIMES,
    });
    resources.track({ kind: 'meal-plan', id: plan.id });

    await foodPage.goto(`/meal-plans/${plan.id}/plan`);
    await expect(foodPage.getByRole('heading', { name: plan.name })).toBeVisible();
    const initialDetail = await getMealPlan(api, plan.id);
    const initialMeals = recordArray(initialDetail.meals);
    const breakfast = initialMeals.find((meal) => meal.meal_type === 'breakfast' && meal.is_reference !== true);
    const lunch = initialMeals.find((meal) => meal.meal_type === 'lunch' && meal.is_reference !== true);
    expect(breakfast?.id).toEqual(expect.any(Number));
    expect(lunch?.id).toEqual(expect.any(Number));

    const duplicateResponse = await api.post(`/api/meal-plans/${plan.id}/meals/`, {
      headers: { 'X-CSRFToken': await getCsrfToken(api) },
      data: {
        start_datetime: '2026-09-07T12:00:00',
        end_datetime: '2026-09-07T13:00:00',
        meal_type: 'lunch',
      },
    });
    expect(duplicateResponse.status()).toBe(400);

    const addDayResponse = foodPage.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().endsWith(`/api/meal-plans/${plan.id}/add-day-after/`),
    );
    await foodPage.getByRole('button', { name: 'Tag danach', exact: true }).click();
    await addDayResponse;
    const withSecondDay = await getMealPlan(api, plan.id);
    expect(recordArray(withSecondDay.meals).filter((meal) => meal.is_reference !== true)).toHaveLength(8);

    const note = uniqueName('E2E Mahlzeitnotiz');
    const breakfastCard = foodPage.locator('#meal-2026-09-07-breakfast');
    await breakfastCard.getByTitle('Aktionen').click();
    await foodPage.getByRole('menuitem', { name: 'Einstellungen', exact: true }).click();
    const mealSettings = foodPage.getByRole('dialog');
    await mealSettings.getByLabel('Notiz / Speiseplan-Hinweis').fill(note);
    const mealUpdate = foodPage.waitForRequest((request) =>
      request.method() === 'PATCH' && request.url().includes(`/api/meal-plans/${plan.id}/meals/`),
    );
    await mealSettings.getByRole('button', { name: 'Speichern', exact: true }).click();
    const mealUpdateBody = assertRecord((await mealUpdate).postDataJSON());
    expect(mealUpdateBody.note).toBe(note);
    await expect(foodPage.getByText(note, { exact: true })).toBeVisible();

    await breakfastCard.getByTitle('Aktionen').click();
    await foodPage.getByRole('menuitem', { name: 'Mahlzeit löschen', exact: true }).click();
    const deleteMealResponse = foodPage.waitForResponse((response) =>
      response.request().method() === 'DELETE' && response.url().includes(`/api/meal-plans/${plan.id}/meals/`),
    );
    await foodPage.getByRole('dialog').getByRole('button', { name: 'Löschen', exact: true }).click();
    await deleteMealResponse;
    const afterMealDelete = await getMealPlan(api, plan.id);
    expect(recordArray(afterMealDelete.meals).some((meal) => meal.id === breakfast?.id)).toBe(false);

    await foodPage.getByRole('link', { name: /Tabelle/ }).click();
    await foodPage.waitForURL(new RegExp(`/meal-plans/${plan.id}/table$`));
    await expect(foodPage.getByRole('columnheader', { name: 'Mahlzeit' })).toBeVisible();

    await foodPage.getByRole('link', { name: /Kochplan/ }).click();
    await foodPage.waitForURL(new RegExp(`/meal-plans/${plan.id}/cooking-schedule$`));
    await expect(foodPage.getByRole('heading', { name: 'Kochplan' })).toBeVisible();
    await expect(foodPage.getByText('Keine Rezepte im Kochplan', { exact: true })).toBeVisible();

    await captureWindowOpen(foodPage);
    await foodPage.getByRole('button', { name: 'Als PDF öffnen' }).last().click();
    const cookingPdfDialog = foodPage.getByRole('dialog');
    await expect(cookingPdfDialog).toBeVisible();
    await cookingPdfDialog.getByRole('button', { name: 'PDF öffnen', exact: true }).click();
    await expectOpenedUrl(foodPage, new RegExp(`/api/meal-plans/${plan.id}/cooking-schedule/export/pdf/`));

    await foodPage.getByRole('link', { name: /Einkaufsliste/ }).click();
    await foodPage.waitForURL(new RegExp(`/meal-plans/${plan.id}/shopping$`));
    await expect(foodPage.getByText('Noch keine Zutaten', { exact: true })).toBeVisible();
    await foodPage.reload();
    await expect(foodPage).toHaveURL(new RegExp(`/meal-plans/${plan.id}/shopping$`));
    await expect(foodPage.getByText('Noch keine Zutaten', { exact: true })).toBeVisible();

    await foodPage.goto(`/meal-plans/${plan.id}/plan`);
    await captureWindowOpen(foodPage);
    await foodPage.getByRole('button', { name: 'Als PDF öffnen' }).click();
    await expect(foodPage.getByRole('dialog')).toBeVisible();
    const planPdfDialog = foodPage.getByRole('dialog');
    await planPdfDialog.getByRole('button', { name: 'PDF öffnen', exact: true }).click();
    await expectOpenedUrl(foodPage, new RegExp(`/api/meal-plans/${plan.id}/export/pdf/`));
  });

  test('renders budget cockpit and quick actions in table view', async ({ foodPage, api, resources, uniqueName }) => {
    const plan = await createMealPlan(api, uniqueName('E2E Cockpit Plan'), {
      budget_per_person_per_day: 6.5,
      norm_portions: 10,
    });
    resources.track({ kind: 'meal-plan', id: plan.id });

    await foodPage.goto(`/meal-plans/${plan.id}/plan`);
    await expect(foodPage.getByText('Tagesbudget / Person')).toBeVisible();
    await expect(foodPage.getByText('Kalorienschnitt / Tag')).toBeVisible();
    await expect(foodPage.getByText('10.0 Personen')).toBeVisible();

    await foodPage.getByRole('link', { name: /Tabelle/ }).click();
    await foodPage.waitForURL(new RegExp(`/meal-plans/${plan.id}/table$`));

    // Check quick add buttons in meal slots
    await expect(foodPage.getByRole('button', { name: 'Rezept', exact: true }).first()).toBeVisible();
    await expect(foodPage.getByRole('button', { name: 'Zutat', exact: true }).first()).toBeVisible();
  });
});
