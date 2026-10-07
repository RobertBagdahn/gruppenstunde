import { describe, expect, it } from 'vitest';

import {
  MealItemSchema,
  PlanSuggestionContextSchema,
  RecipeSearchResultSchema,
  RecipeSuggestionSchema,
  SuggestionPanelResponseSchema,
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

describe('suggestion panel contract', () => {
  it('parses the backend panel response including the echoed filters', () => {
    const result = SuggestionPanelResponseSchema.parse({
      meal_type: 'snack',
      directions: [
        {
          key: 'fruit_veg',
          label: 'Obst & Gemüse',
          hint: 'Frisch und gesund',
          cards: [
            {
              kind: 'ingredient',
              id: 7,
              title: 'Apfel',
              slug: 'apfel',
              type_label: 'Zutat',
              reason_text: 'Ohne Vorbereitung',
              price_per_person: 0.12,
              recipe_type: null,
              badge: 'verified',
              is_new: false,
              portion_id: 11,
              measuring_unit_id: 3,
              quantity: 1,
            },
          ],
        },
      ],
      total: 1,
      relaxed_filters: [],
      missing_context: ['cooling'],
      context: {
        age_groups: ['children'],
        age_derived: true,
        setting: 'camp',
        cooking_sources: ['campfire'],
        cooling: '',
        season_hint: 'cold',
        season_derived: true,
      },
      filters: { taste: null, prep: null, kids: null, budget: null, diet: null, with_dessert: false },
      ai_used: false,
      seed: 12,
    });

    expect(result.directions[0].cards[0].quantity).toBe(1);
    expect(result.context.age_groups).toEqual(['children']);
  });

  it('rejects unknown context values', () => {
    expect(() => PlanSuggestionContextSchema.parse({ cooking_sources: ['microwave'] })).toThrow();
  });

  it('carries the optional note of a meal item', () => {
    const base = {
      id: 1, recipe_id: null, recipe_title: '', recipe_slug: '', image_url: null, ingredient_id: 2,
      ingredient_name: 'Gurke', ingredient_slug: 'gurke', quantity: 100, measuring_unit_id: 1,
      measuring_unit_name: 'Gramm', display_name: null, factor: 1, active_recipe_item_ids: [],
      variant_group_id: null, energy_kcal: 15, cost_eur: null, quantity_g: 100, ingredient_tags: [],
      recipe_type: '', overrides: [],
    };

    expect(MealItemSchema.parse({ ...base, note: 'ohne Schale' }).note).toBe('ohne Schale');
    expect(MealItemSchema.parse(base).note).toBeUndefined();
  });
});
