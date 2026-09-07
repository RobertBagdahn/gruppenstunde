import { describe, expect, it } from 'vitest';

import {
  RecipeSearchResultSchema,
  RecipeSuggestionSchema,
} from './mealPlan';

describe('meal-plan recipe contracts', () => {
  it('accepts normalized portions and nullable price data', () => {
    const result = RecipeSearchResultSchema.parse({
      id: 1,
      title: 'Suppe',
      slug: 'suppe',
      recipe_type: 'warm_meal',
      image_url: null,
      portions: 1,
      cached_price_total: null,
      price_per_serving: null,
    });

    expect(result.portions).toBe(1);
    expect(result.price_per_serving).toBeNull();
  });

  it('uses image_url for suggestion previews', () => {
    const result = RecipeSuggestionSchema.parse({
      id: 1,
      title: 'Suppe',
      usage_count: 2,
      image_url: null,
      recipe_type: 'warm_meal',
    });

    expect(result).toHaveProperty('image_url');
    expect(result).not.toHaveProperty('image_thumbnail');
  });
});
