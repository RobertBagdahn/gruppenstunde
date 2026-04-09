/**
 * Zod schemas for the Ingredient Database API.
 *
 * BACKWARD COMPATIBILITY: This file re-exports from supply.ts where all
 * Ingredient/Portion schemas now live. Existing imports from this
 * file continue to work unchanged.
 *
 * MUST stay in sync with backend/supply/schemas.py
 */
export {
  RetailSectionSchema,
  type RetailSection,
  NutritionalTagSchema,
  type NutritionalTag,
  PortionSchema,
  type Portion,
  IngredientAliasSchema,
  type IngredientAlias,
  IngredientListItemSchema,
  type IngredientListItem,
  IngredientDetailSchema,
  type IngredientDetail,
  PaginatedIngredientSchema,
  type PaginatedIngredient,
  RecipeHintSchema,
  type RecipeHint,
  RecipeHintMatchSchema,
  type RecipeHintMatch,
  RecipeCheckSchema,
  type RecipeCheck,
  NutriScoreDetailSchema,
  type NutriScoreDetail,
  NUTRI_SCORE_COLORS,
} from './supply';
