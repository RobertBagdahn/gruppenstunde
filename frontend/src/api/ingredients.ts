/**
 * TanStack Query hooks for the Ingredient Database API.
 *
 * BACKWARD COMPATIBILITY: This file re-exports from supplies.ts where all
 * Ingredient/Portion hooks now live. Existing imports from this
 * file continue to work unchanged.
 *
 * MUST stay in sync with backend/supply/api.py
 */
export {
  useIngredients,
  useIngredient,
  useCreateIngredient,
  useUpdateIngredient,
  useDeleteIngredient,
  usePortions,
  useCreatePortion,
  useUpdatePortion,
  useDeletePortion,
  useCreateAlias,
  useDeleteAlias,
  useNutritionalTags,
  useRetailSections,
  type IngredientFilters,
} from './supplies';

// Re-export recipe analysis hooks from recipes.ts (they stayed there)
export { useRecipeChecks, useRecipeHints, useRecipeNutriScore } from './recipes';
