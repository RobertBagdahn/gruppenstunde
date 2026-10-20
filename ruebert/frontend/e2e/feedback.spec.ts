import { expect, test } from '@playwright/test';

import { routeApi } from './apiRoutes';

const SENT = {
  status: 'sent',
  message: 'Danke. Die Rückmeldung ist als Issue #42 angelegt.',
  issue_number: 42,
  issue_url: 'https://github.com/RobertBagdahn/seed-demand/issues/42',
};

// 9.2 and 9.3 on both viewports: the button stays reachable and does not cover the page's primary action.
test.describe('Rückmeldung (9.2) und Präsentationsmodus (9.3)', () => {
  test('the beet button opens the menu, sends with context, and does not cover the primary action', async ({ page }) => {
    const calls = await routeApi(page, { 'POST /api/feedback': SENT });
    await page.goto('/order-plans');
    const button = page.getByRole('button', { name: 'Rückmeldung geben' });
    await expect(button).toBeInViewport();

    const primary = page.getByRole('button', { name: /Freigeben …/ });
    await primary.scrollIntoViewIfNeeded();
    const covered = await primary.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return !el.contains(top);
    });
    expect(covered).toBe(false);

    await button.click();
    await page.getByRole('menuitem', { name: 'Bug' }).click();
    await page.getByLabel('Titel').fill('Herleitung fehlt');
    await page.getByRole('button', { name: 'Senden' }).click();
    await expect(page.getByRole('link', { name: 'Issue #42 öffnen' })).toBeVisible();
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/feedback')).toBe(true);
  });

  test('pins appear only in presentation mode and show the question', async ({ page }) => {
    await routeApi(page);
    await page.goto('/order-plans');
    await expect(page.getByRole('button', { name: 'Q-050' })).toHaveCount(0);
    await page.getByRole('switch', { name: /Präsentationsmodus/ }).click();
    await page.getByRole('button', { name: 'Q-050' }).click();
    await expect(page.getByText(/Bestätigst du die Rundungsregel/)).toBeVisible();
  });
});
