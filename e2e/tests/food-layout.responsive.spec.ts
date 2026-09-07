import { test, expect } from '../fixtures/food';

test('recipe action controls match the viewport', async ({ foodPage }) => {
  await foodPage.goto('/recipes');
  const firstRecipe = foodPage.locator('a[href^="/recipes/"]:not([href$="/new"])').filter({ hasNot: foodPage.locator('span:has-text("Neues Rezept")') }).first();
  await expect(firstRecipe).toBeVisible();
  await firstRecipe.click();
  await expect(foodPage.getByTestId('recipe-detail-actions')).toBeVisible();

  if (test.info().project.name === 'desktop') {
    await expect(foodPage.locator('aside')).toBeVisible();
    await expect(foodPage.getByTestId('recipe-mobile-action-bar')).toBeHidden();
  } else {
    await expect(foodPage.getByTestId('recipe-mobile-action-bar')).toBeVisible();
    await expect(foodPage.locator('aside')).toBeHidden();
  }

  const overflow = await foodPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
