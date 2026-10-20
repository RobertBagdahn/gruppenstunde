import { expect, test } from '@playwright/test';

import { routeApi } from './apiRoutes';

// Scenarios of the tasks 8.1 to 8.7. Both viewports (1440 px and 375 px) come from the Playwright projects.

test.describe('8.1 Entscheidungen: Item wählen, annehmen', () => {
  test('selects a queue item and accepts the suggestion into the journal', async ({ page }) => {
    const calls = await routeApi(page, {
      'POST /api/traffic-light/DGW001/decision': { sku: 'DGW001', decision: 'annehmen' },
    });
    await page.goto('/');
    const queue = page.getByRole('region', { name: 'Offene Entscheidungen' });
    await expect(queue.getByRole('button').first()).toBeVisible();
    await queue.getByRole('button').first().click();
    await page.getByRole('button', { name: /Übernehmen/ }).click();
    await expect.poll(() => calls.some((c) => c.method === 'POST')).toBe(true);
  });
});

test.describe('8.2 Artikel: Filter Rot, Artikel, Herleitung aufklappen', () => {
  test('filters to red articles, opens one and shows its derivation', async ({ page }) => {
    await routeApi(page);
    await page.goto('/products');
    await page.getByRole('radio', { name: 'Rot' }).click();
    await expect(page).toHaveURL(/colour=red/);
    await page.getByRole('link', { name: /DGW\d+/ }).first().click();
    await expect(page).toHaveURL(/\/products\/DGW\d+$/);
    await expect(page.getByRole('list', { name: 'Herleitung' })).toBeVisible();
    await expect(page.getByRole('img', { name: /80-%-Bereich|Absatz, Prognose/ })).toBeVisible();
  });
});

test.describe('8.3 Bestellplaner: Menge ändern, Summe und Abweichung, freigeben', () => {
  test('changes a quantity on the grid and asks before approving', async ({ page }) => {
    const calls = await routeApi(page);
    await page.goto('/order-plans');
    await expect(page.getByText(/Ziel KW 39\/2027/)).toBeVisible();
    await page.getByRole('button', { name: /^Menge .* erhöhen$/ }).first().click();
    await expect.poll(() => calls.some((c) => c.method === 'PUT')).toBe(true);
    await page.getByRole('button', { name: /Freigeben …/ }).click();
    await expect(page.getByRole('dialog', { name: 'Freigabe bestätigen' })).toBeVisible();
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/order-plans/approve')).toBe(false);
  });
});

test.describe('8.4 Fremdmarke: Banner und Lieferanten-Drill-down', () => {
  test('shows the sample banner and opens a supplier', async ({ page }) => {
    await routeApi(page);
    await page.goto('/supplier-orders');
    await expect(page.getByRole('note')).toContainText('Beispieldaten.');
    await page.getByRole('link', { name: /Beispiel-Lieferant/ }).first().click();
    await expect(page).toHaveURL(/\/supplier-orders\/BSP-L1$/);
    await expect(page.getByRole('table', { name: 'Artikel des Lieferanten' })).toBeVisible();
    await expect(page.getByRole('note')).toContainText('Beispieldaten.');
  });
});

test.describe('8.5 Fall-Inbox, OOS-Monitor, Ereignisse', () => {
  test('decides a case through the journal endpoint', async ({ page }) => {
    const sample = {
      items: [
        {
          case_id: 'bulk_shipping:DGW001:2026-02-02',
          kind: 'bulk_shipping',
          kind_label: 'Sammelbuchung',
          sku: 'DGW001',
          title: 'Sammelbuchung KW 6/2026: 200 Tüten',
          week_start: '2026-02-02',
          question_id: 'Q-024',
          decision: null,
          decided_by: null,
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      total_pages: 1,
    };
    const detail = {
      ...sample.items[0],
      summary: 'Nachfrage oder technische Buchung?',
      actual_qty: 200,
      expected_qty: null,
      booking_count: 1,
      options: ['Nachfrage', 'keine Nachfrage'],
      first_date: '2026-02-02',
      last_date: '2026-02-02',
      note: null,
    };
    const calls = await routeApi(page, {
      'GET /api/cases': sample,
      'GET /api/cases/bulk_shipping:DGW001:2026-02-02': detail,
      'POST /api/cases/bulk_shipping:DGW001:2026-02-02/decision': { ...sample.items[0], decision: 'keine Nachfrage' },
    });
    await page.goto('/data/cases');
    await page.getByRole('region', { name: 'Fälle' }).getByRole('button').first().click();
    await page.getByRole('button', { name: 'keine Nachfrage' }).click();
    await expect.poll(() => calls.some((c) => c.method === 'POST' && c.path.endsWith('/decision'))).toBe(true);
  });

  test('confirms a stock-out phase as a hypothesis', async ({ page }) => {
    const phases = {
      items: [
        {
          phase_id: 'DGW001:2021-09-24',
          sku: 'DGW001',
          start_date: '2021-09-24',
          end_date: '2021-09-28',
          duration_days: 4,
          shipped_during: 0,
          status: 'offen',
          question_id: 'Q-101',
        },
      ],
      total: 1,
      page: 1,
      page_size: 100,
      total_pages: 1,
    };
    const calls = await routeApi(page, {
      'GET /api/stockouts': phases,
      'POST /api/stockouts/DGW001:2021-09-24/decision': { ...phases.items[0], status: 'bestätigt' },
    });
    await page.goto('/data/stockouts');
    await page.getByRole('button', { name: 'Bestätigen' }).click();
    await expect.poll(() => calls.some((c) => decodeURIComponent(c.path) === '/api/stockouts/DGW001:2021-09-24/decision')).toBe(true);
  });

  test('shows example events with the Beispiel badge and the add form', async ({ page }) => {
    await routeApi(page);
    await page.goto('/data/events');
    await expect(page.getByText('Beispiel', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('form', { name: 'Ereignis hinzufügen' })).toBeVisible();
  });
});

test.describe('8.6 Prognosegüte, Sets, Daten & Läufe', () => {
  test('shows model quality, sets and runs', async ({ page }) => {
    await routeApi(page);
    await page.goto('/forecast-quality');
    await expect(page.getByRole('table', { name: 'Modelle' })).toBeVisible();
    await page.goto('/sets');
    await expect(page.getByRole('link', { name: /SET001/ })).toBeVisible();
    await page.goto('/data/quality');
    await expect(page.getByText('Prüfsumme')).toBeVisible();
  });
});

test.describe('8.7 Einstellungen: Planungsfenster ändern', () => {
  test('saves a parameter and refreshes the traffic light', async ({ page }) => {
    const calls = await routeApi(page, {
      'PUT /api/settings/planning_window_weeks': {
        key: 'planning_window_weeks',
        label: 'Planungsfenster',
        help: 'Wochen nach Ablauf der Lieferzeit, in denen ein Artikel gelb ist.',
        unit: 'Wochen',
        value: 6,
        default: 8,
        minimum: 1,
        maximum: 52,
        status: 'offen Q-080',
        question_id: 'Q-080',
        changed_by: 'Demo-Nutzer',
        changed_at: '2026-05-18T09:00:00Z',
      },
    });
    await page.goto('/settings');
    const input = page.getByLabel('Planungsfenster');
    await input.fill('6');
    await input.locator('xpath=ancestor::form').getByRole('button', { name: 'Speichern' }).click();
    await expect.poll(() => calls.some((c) => c.method === 'PUT' && c.path === '/api/settings/planning_window_weeks')).toBe(true);
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Offene Entscheidungen' })).toBeVisible();
  });
});
