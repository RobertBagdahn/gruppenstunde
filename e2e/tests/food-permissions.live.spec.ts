import { test, expect } from '../fixtures/food';

test('unauthenticated access to protected and public Food collection endpoints', async ({ browser, foodPage }) => {
  const baseURL = new URL(foodPage.url()).origin;
  const context = await browser.newContext({ baseURL });
  try {
    // Ingredients and Recipes are public collections (status=approved/verified visible to unauthenticated users)
    const publicEndpoints = ['/api/ingredients/', '/api/recipes/'];
    for (const endpoint of publicEndpoints) {
      const response = await context.request.get(endpoint);
      expect(response.status()).toBe(200);
    }

    // MealPlans and ShoppingLists are personal/collaborative and require authentication
    const protectedEndpoints = ['/api/meal-plans/', '/api/shopping-lists/'];
    for (const endpoint of protectedEndpoints) {
      const response = await context.request.get(endpoint);
      expect([401, 403]).toContain(response.status());
    }
  } finally {
    await context.close();
  }
});
