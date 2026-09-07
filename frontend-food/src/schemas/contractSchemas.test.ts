import { describe, expect, it } from 'vitest';
import { ImprovementSchema, RecipeDetailSchema } from './recipe';
import { PortionOptionSchema, ShoppingItemSourceSchema } from './mealPlan';
import { IngredientDetailSchema } from './supply';

describe('food API contracts', () => {
  it('accepts ingredient shopping sources and applies numeric defaults', () => {
    const result = ShoppingItemSourceSchema.parse({ ingredient_id: 7 });
    expect(result).toMatchObject({ ingredient_id: 7, recipe_id: null, quantity_g: 0 });
    expect(PortionOptionSchema.parse({ name: 'Packung', display: '500 g', is_default: false })).toMatchObject({
      weight_g: 0,
      count: 0,
    });
  });

  it('requires server permission and synchronised visibility fields', () => {
    expect(
      IngredientDetailSchema.safeParse({
        name: 'Haferflocken',
        visibility: 'shared',
        can_edit: true,
        can_delete: false,
      }).success,
    ).toBe(false);
    expect(IngredientDetailSchema.shape.visibility.safeParse('public').success).toBe(true);
  });

  it('rejects invalid enum values and accepts both improvement directions', () => {
    expect(ImprovementSchema.shape.direction.safeParse('keep').success).toBe(false);
    expect(ImprovementSchema.shape.direction.safeParse('reduce').success).toBe(true);
    expect(ImprovementSchema.shape.direction.safeParse('increase').success).toBe(true);
  });

  it('accepts transient AI serving context without changing persisted portions', () => {
    const result = RecipeDetailSchema.parse({
      id: 1,
      slug: 'fixture',
      title: 'Fixture',
      summary: '',
      summary_long: '',
      description: '',
      image_url: null,
      execution_time: 'less_30',
      preparation_time: 'none',
      difficulty: 'easy',
      status: 'draft',
      like_score: 0,
      view_count: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      scout_levels: [],
      tags: [],
      can_edit: true,
      can_delete: false,
      recipe_type: 'warm_meal',
      portions: 1,
      input_servings: 4,
    });

    expect(result.portions).toBe(1);
    expect(result.input_servings).toBe(4);
  });
});
