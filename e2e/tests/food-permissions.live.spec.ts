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

    // MealPlans are readable by visitors, but only the public, verified and template plans.
    const plansResponse = await context.request.get('/api/meal-plans/');
    expect(plansResponse.status()).toBe(200);
    const plans = (await plansResponse.json()) as Array<{
      owner_id: number | null;
      visibility: string;
      is_template?: boolean;
    }>;
    for (const plan of plans) {
      const isVisibleToVisitors = plan.owner_id === null || plan.visibility === 'public' || plan.is_template === true;
      expect(isVisibleToVisitors, `plan with visibility "${plan.visibility}" must not reach visitors`).toBe(true);
    }

    // ShoppingLists are personal/collaborative and require authentication
    const response = await context.request.get('/api/shopping-lists/');
    expect([401, 403]).toContain(response.status());
  } finally {
    await context.close();
  }
});
