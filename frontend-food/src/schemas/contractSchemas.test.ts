import { describe, expect, it } from 'vitest';
import { getRecipeExecutionTimeLabel, ImprovementSchema, RecipeDetailSchema } from './recipe';
import { PortionOptionSchema, ShoppingItemSourceSchema } from './mealPlan';
import { IngredientDetailSchema } from './supply';
import { RecipeImportUrlResponseSchema } from '../api/recipeImport';

describe('food API contracts', () => {
  it('maps legacy execution-time values to the current German label', () => {
    expect(getRecipeExecutionTimeLabel('less_5')).toBe('< 30 Min');
  });

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
  it('accepts UUID tag ids from the recipe import endpoint', () => {
    // Tag.id is a UUID. RecipeDraftOut.tag_ids is `list[str]`, so validating
    // as numbers rejected every import response that carried a tag.
    const response = {
      recipe_draft: {
        title: 'Möhrchenpfanne',
        description: '',
        summary: '',
        servings: 2,
        preparation_time: null,
        execution_time: null,
        recipe_type: 'warm_meal',
        steps: [],
        source_url: 'https://example.com/recipe',
        tag_ids: ['058e7081-bb7d-4412-a67c-a828052c3910'],
      },
      recipe_items: [],
      created_ingredients: [],
    };

    const parsed = RecipeImportUrlResponseSchema.parse(response);
    expect(parsed.recipe_draft.tag_ids).toEqual(['058e7081-bb7d-4412-a67c-a828052c3910']);
  });

  it('flags import items whose unit could not be resolved', () => {
    const parsed = RecipeImportUrlResponseSchema.parse({
      recipe_draft: {
        title: 'Möhrchenpfanne',
        description: '',
        summary: '',
        servings: 2,
        preparation_time: null,
        execution_time: null,
        recipe_type: 'warm_meal',
        steps: [],
        source_url: 'https://example.com/recipe',
      },
      recipe_items: [
        {
          ingredient_id: 1,
          ingredient_name: 'Möhre',
          quantity: 4,
          measuring_unit_id: null,
          measuring_unit_name: '',
          note: '',
          is_new_ingredient: false,
          portion_id: null,
          needs_unit_clarification: true,
          suggested_unit_name: '',
          suggested_portion_weight_g: 80,
        },
      ],
      created_ingredients: [],
    });

    expect(parsed.recipe_items[0].needs_unit_clarification).toBe(true);
    expect(parsed.recipe_items[0].suggested_portion_weight_g).toBe(80);
  });
});
