/**
 * Builders for `POST /api/recipes/ingredient-review/preview/` mocks.
 * Mirrors `IngredientReviewPreviewSchema` in `frontend-food/src/schemas/ingredientReview.ts`.
 */

export interface ReviewRecipeDraft {
  title: string;
  description?: string;
  summary?: string;
  servings?: number | null;
  preparation_time?: number | null;
  execution_time?: number | null;
  recipe_type?: string;
  difficulty?: string;
  execution_time_choice?: string;
  preparation_time_choice?: string;
  scout_level_ids?: number[];
  tag_ids?: string[];
  steps?: string[];
  source_url?: string;
  image_url?: string;
}

export interface ConfirmableRowOptions {
  key: string;
  sourceText: string;
  ingredientId: number;
  ingredientName: string;
  ingredientSlug?: string;
  portionId: number;
  portionName?: string;
  /** Total quantity for the recipe draft's servings, in portion units. */
  quantity: number;
}

/**
 * A row with an existing ingredient and portion already selected, so
 * "Alle Vorschläge übernehmen" can confirm it.
 */
export function confirmableReviewRow(options: ConfirmableRowOptions): Record<string, unknown> {
  const portion = {
    id: options.portionId,
    name: options.portionName ?? 'Gramm',
    quantity: 1,
    weight_g: 1,
    measuring_unit_id: null,
    measuring_unit_name: null,
    is_new: false,
  };
  return {
    key: options.key,
    source_text: options.sourceText,
    sources: [],
    selected_ingredient_id: options.ingredientId,
    selected_ingredient_slug: options.ingredientSlug ?? '',
    selected_ingredient_name: options.ingredientName,
    suggested_ingredient_id: options.ingredientId,
    suggested_ingredient_name: options.ingredientName,
    candidates: [],
    selected_portion: portion,
    suggested_portion: portion,
    quantity: options.quantity,
    suggested_quantity: options.quantity,
    reason: '',
    technical_details: null,
    conflicts: [],
    new_ingredient_draft: null,
    status: 'open',
  };
}

export function reviewPreview(
  draft: ReviewRecipeDraft,
  rows: Record<string, unknown>[] = [],
  source: { type: 'url' | 'text'; value: string } = { type: 'text', value: draft.title },
): Record<string, unknown> {
  return {
    rows,
    sources: [{ ...source, label: source.type === 'url' ? source.value : 'Eingefügter Text' }],
    ai_interaction_id: null,
    is_reconstructed: false,
    recipe_draft: {
      description: '',
      summary: '',
      servings: 1,
      preparation_time: null,
      execution_time: null,
      recipe_type: 'warm_meal',
      difficulty: 'easy',
      execution_time_choice: 'less_30',
      preparation_time_choice: 'none',
      scout_level_ids: [],
      tag_ids: [],
      steps: [],
      source_url: '',
      image_url: '',
      ...draft,
    },
  };
}

export const REVIEW_PREVIEW_ROUTE = '**/api/recipes/ingredient-review/preview/';
