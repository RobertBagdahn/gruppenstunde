import { test, expect } from '../fixtures/food';

test('meal time controls do not overflow the viewport', async ({ foodPage }) => {
  await foodPage.goto('/meal-plans/new');
  await foodPage.getByPlaceholder('z.B. Sommerlager 2026').fill('Responsive E2E Plan');
  await foodPage.getByRole('button', { name: 'Erweiterte Einstellungen anzeigen' }).click();

  await expect(foodPage.getByTestId('meal-time-group-breakfast')).toBeVisible();
  await expect(foodPage.locator('input[type="time"]')).toHaveCount(8);
  const overflow = await foodPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
