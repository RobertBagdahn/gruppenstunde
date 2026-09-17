import { describe, expect, it } from 'vitest';
import {
  getRecipeExecutionTimeLabel,
  ImprovementSchema,
  RecipeDetailSchema,
  RecipeMaterialSchema,
  AiMaterialSuggestionsSchema,
} from './recipe';
import { PortionOptionSchema, ShoppingItemSourceSchema, MealPlanCostSummarySchema } from './mealPlan';
import { IngredientDetailSchema } from './supply';
import {
  PriceApplyRequestSchema,
  PriceApplyResponseSchema,
  PriceEvaluateResponseSchema,
} from './dataQuality';
import { RecipeImportUrlResponseSchema } from '../api/recipeImport';
import { PortionMagicApplySchema, PortionMagicPreviewSchema } from './supply';
import { PortionRepairFindingSchema } from './portionRepair';

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
           ingredient_slug: 'mohre',
          quantity: 4,
          measuring_unit_id: null,
          measuring_unit_name: '',
          note: '',
          is_new_ingredient: false,
          portion_id: null,
          needs_unit_clarification: true,
          suggested_unit_name: '',
           suggested_portion_weight_g: 80,
           weight_status: 'ai_proposed',
           weight_proposal_g: 80,
           suggested_portion_name: 'Möhre',
           confirmation_required: true,
        },
      ],
      created_ingredients: [],
    });

    expect(parsed.recipe_items[0].needs_unit_clarification).toBe(true);
    expect(parsed.recipe_items[0].suggested_portion_weight_g).toBe(80);
  });

  it('parses portion magic-wand preview and apply contracts', () => {
    const operation = {
      operation_id: 'operation-0',
      operation: 'replace',
      source_portion_id: 4,
      name: 'Stück',
      quantity: 1,
      measuring_unit_name: 'Gramm',
      rank: 1,
      proposed_weight_g: 150,
       confidence: 0.9,
       rationale: 'Typisches Gewicht',
       suggestion_provenance: 'ai_estimate',
      selected: true,
      requires_manual_weight: false,
      delete_without_replacement: false,
    } as const;
    expect(PortionMagicPreviewSchema.parse({ preview_token: 'token', operations: [operation] }).operations).toHaveLength(1);
    expect(PortionMagicApplySchema.parse({
      portions: [],
      replaced_portion_ids: [4],
      created_portion_ids: [5],
      deleted_portion_ids: [4],
    }).created_portion_ids).toEqual([5]);
  });

  it('parses repair classification fields', () => {
    const finding = PortionRepairFindingSchema.parse({
      id: 1,
      portion_id: 2,
      ingredient_id: 3,
      ingredient_name: 'Apfel',
      portion_name: 'Stück',
      detection_reason: 'missing_weight',
      status: 'candidate',
      before_snapshot: {
        name: 'Stück',
        weight_g: null,
        quantity: 1,
        rank: 1,
        measuring_unit_id: 1,
        measuring_unit_name: 'Gramm',
        measuring_unit_unit: 'g',
      },
      recipe_item_ids: [],
      ai_proposal: {},
      confidence: null,
      prompt_version: '1',
      threshold: null,
      applied_portion_id: null,
      moved_recipe_item_ids: [],
      affected_recipe_ids: [],
      applied_at: null,
      rejected_at: null,
      created_at: '2026-01-01T00:00:00Z',
      repair_path: 'review',
      suggested_weight_g: null,
    });
    expect(finding.repair_path).toBe('review');
  });

  it('parses partial price coverage with affected items', () => {
    const recipe = RecipeDetailSchema.parse({
      ...RECIPE_DETAIL_BASE,
      price_coverage: {
        total_ingredients: 2,
        priced_ingredients: 1,
        missing_ingredients: 1,
        coverage: 0.5,
        status: 'partial',
        affected_items: [{ recipe_item_id: 9, ingredient_name: 'Zwiebel', reason: 'missing_price' }],
      },
    });
    expect(recipe.price_coverage?.status).toBe('partial');
    expect(recipe.price_coverage?.affected_items[0]?.ingredient_name).toBe('Zwiebel');
  });
});

const RECIPE_DETAIL_BASE = {
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
};

describe('recipe material contracts', () => {
  it('parses populated material records', () => {
    const material = RecipeMaterialSchema.parse({
      id: 7,
      material_id: 12,
      material_name: 'Zahnstocher',
      material_slug: 'zahnstocher',
      material_category: 'kitchen',
      quantity: '30 Stück',
      sort_order: 0,
    });
    expect(material).toMatchObject({ material_name: 'Zahnstocher', quantity: '30 Stück' });
  });

  it('parses legacy admin-created records with empty or missing quantity', () => {
    const legacy = RecipeMaterialSchema.parse({
      id: 8,
      material_id: 13,
      material_name: 'Backpapier',
      material_slug: 'backpapier',
      material_category: 'kitchen',
      quantity: '',
      sort_order: 1,
    });
    expect(legacy.quantity).toBe('');

    const missingQuantity = RecipeMaterialSchema.parse({
      id: 9,
      material_id: 14,
      material_name: 'Alufolie',
      material_slug: 'alufolie',
      material_category: 'kitchen',
      sort_order: 2,
    });
    expect(missingQuantity.quantity).toBe('');
  });

  it('defaults materials to an empty list on recipe detail', () => {
    const parsed = RecipeDetailSchema.parse(RECIPE_DETAIL_BASE);
    expect(parsed.materials).toEqual([]);
  });

  it('keeps materials separate from equipment and recipe items', () => {
    const parsed = RecipeDetailSchema.parse({
      ...RECIPE_DETAIL_BASE,
      equipment: [{ id: 1, name: 'Topf', slug: 'topf' }],
      materials: [
        {
          id: 7,
          material_id: 12,
          material_name: 'Zahnstocher',
          material_slug: 'zahnstocher',
          material_category: 'kitchen',
          quantity: '30 Stück',
          sort_order: 0,
        },
      ],
    });
    expect(parsed.materials).toHaveLength(1);
    expect(parsed.equipment).toHaveLength(1);
    expect(parsed.recipe_items).toEqual([]);
  });

  it('parses AI material suggestions with matched and unmatched items', () => {
    const parsed = AiMaterialSuggestionsSchema.parse({
      items: [
        {
          material_id: 12,
          suggested_name: 'Zahnstocher',
          quantity: '30 Stück',
          matched_name: 'Zahnstocher',
          is_new: false,
        },
        {
          material_id: null,
          suggested_name: 'Spießhalter',
          quantity: '1 Stück',
          matched_name: null,
          is_new: true,
        },
      ],
      ai_interaction_id: 'ai-interaction-1',
    });
    expect(parsed.items[0].is_new).toBe(false);
    expect(parsed.items[1].is_new).toBe(true);
  });
});

describe('price approval contracts', () => {
  it('parses evaluate responses carrying pending proposal metadata', () => {
    const parsed = PriceEvaluateResponseSchema.parse({
      suggestions: [
        {
          ingredient_id: 5,
          current_price: null,
          suggested_price: '3.49',
          reasoning: 'Typischer Supermarktpreis.',
          proposal_id: 12,
          status: 'pending',
          confidence: 0.8,
        },
        {
          ingredient_id: 6,
          current_price: '2.49',
          suggested_price: null,
          reasoning: 'Diese Zutat besitzt bereits einen Preis.',
          status: 'conflict',
        },
      ],
      batch_token: 'batch-1',
    });
    expect(parsed.suggestions[0].proposal_id).toBe(12);
    expect(parsed.suggestions[1].status).toBe('conflict');
  });

  it('builds approval requests without raw price payloads', () => {
    const request = PriceApplyRequestSchema.parse({
      items: [{ ingredient_id: 5, action: 'accept', replace: false }],
    });
    expect(request.items[0]).toEqual({ ingredient_id: 5, action: 'accept', replace: false });
    expect('price_per_kg' in request.items[0]).toBe(false);
  });

  it('parses batch apply outcomes including conflicts', () => {
    const parsed = PriceApplyResponseSchema.parse({
      results: [
        { ingredient_id: 5, proposal_id: 12, status: 'accepted', message: 'Preis übernommen' },
        { ingredient_id: 6, proposal_id: 13, status: 'conflict', message: 'Bestehenden Preis bestätigen' },
        { ingredient_id: 7, status: 'missing_proposal' },
      ],
    });
    expect(parsed.results.map((r) => r.status)).toEqual(['accepted', 'conflict', 'missing_proposal']);
  });
});

describe('meal plan cost coverage contracts', () => {
  it('parses full coverage metadata with missing ingredients', () => {
    const parsed = MealPlanCostSummarySchema.parse({
      total_cost: '12.50',
      total_cost_with_reserve: '13.75',
      reserve_factor: '1.1',
      cost_per_person: '1.25',
      norm_portions: 10,
      total_ingredients: 4,
      priced_ingredients: 2,
      missing_ingredients: 2,
      coverage: 0.5,
      days: [],
      recipes: [],
    });
    expect(parsed.missing_ingredients).toBe(2);
    expect(parsed.coverage).toBe(0.5);
  });

  it('defaults missing coverage fields for legacy responses', () => {
    const parsed = MealPlanCostSummarySchema.parse({
      total_cost: '0',
      total_cost_with_reserve: '0',
      reserve_factor: '1',
      cost_per_person: '0',
      norm_portions: 10,
      total_ingredients: 2,
      priced_ingredients: 2,
      days: [],
      recipes: [],
    });
    expect(parsed.missing_ingredients).toBe(0);
    expect(parsed.coverage).toBeNull();
  });
});
