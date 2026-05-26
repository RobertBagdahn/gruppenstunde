## MODIFIED Requirements

### Requirement: Signal-based cache invalidation
The system SHALL automatically invalidate and recalculate Recipe caches when underlying data changes, using Django signals. This covers changes to `RecipeItem`, `supply.Ingredient`, `supply.Portion`, and `supply.MeasuringUnit`.

#### Scenario: RecipeItem saved or deleted
- **WHEN** a RecipeItem is saved (`post_save`) or deleted (`post_delete`)
- **THEN** the parent Recipe's cached nutritional fields SHALL be recalculated within the same request cycle

#### Scenario: Ingredient saved
- **WHEN** an Ingredient is saved (`post_save`) with changed nutritional values
- **THEN** all Recipes referencing that Ingredient directly (`RecipeItem.ingredient`) or indirectly (`RecipeItem.portion.ingredient`) SHALL have their caches recalculated

#### Scenario: Ingredient deleted
- **WHEN** an Ingredient is deleted (`post_delete`)
- **THEN** all Recipes that previously referenced that Ingredient directly or via Portion SHALL have their caches recalculated so the removed contribution is no longer reflected in `cached_*` fields

#### Scenario: Portion saved
- **WHEN** a Portion is saved (`post_save`) with changed `weight_g`, `quantity`, `measuring_unit`, or `ingredient`
- **THEN** all Recipes with a RecipeItem referencing that Portion SHALL have their caches recalculated

#### Scenario: Portion deleted
- **WHEN** a Portion is deleted (`post_delete`)
- **THEN** all Recipes that previously referenced that Portion SHALL have their caches recalculated

#### Scenario: MeasuringUnit saved
- **WHEN** a MeasuringUnit is saved (`post_save`) with changed `quantity` factor
- **THEN** all Recipes with a RecipeItem referencing that MeasuringUnit directly or via `portion.measuring_unit` SHALL have their caches recalculated

## ADDED Requirements

### Requirement: LLM suggestion cache keyed by recipe cache timestamp
The LLM-based ingredient suggestion service (`recipe.services.suggestion_service.get_suggestions`) SHALL include the Recipe's `cached_at` timestamp in its Django cache key, so that any change which updates `cached_at` automatically invalidates previously cached suggestions.

#### Scenario: Cache key composition
- **WHEN** `get_suggestions(recipe, objective, user)` is called
- **THEN** the cache key SHALL have the form `recipe_suggestion:{recipe.id}:{cached_at_timestamp}:{hash(objective)}`
- **THEN** `cached_at_timestamp` SHALL be `int(recipe.cached_at.timestamp())` when `cached_at` is set, otherwise `0`

#### Scenario: Cached suggestion reused when recipe unchanged
- **WHEN** the same `(recipe, objective)` combination is requested twice within the TTL window AND `cached_at` has not changed
- **THEN** the second call SHALL return the cached suggestion without invoking Gemini

#### Scenario: Cache miss after recipe change
- **WHEN** a RecipeItem/Ingredient/Portion/MeasuringUnit change has triggered `recalculate_recipe_cache` and updated `cached_at`
- **AND** a suggestion request is made for the same `(recipe, objective)` combination
- **THEN** the previous cache entry SHALL NOT be returned
- **THEN** Gemini SHALL be invoked to produce fresh suggestions

### Requirement: Frontend recipe data invalidation helper
The frontend SHALL provide a single helper function `invalidateRecipeData(queryClient, recipeId)` in `frontend/src/api/recipes.ts` that invalidates all TanStack Query keys whose data can become stale when a Recipe or its RecipeItems change. All Recipe- and RecipeItem-mutating hooks SHALL use this helper in their `onSuccess` callbacks instead of invalidating individual keys.

#### Scenario: Helper invalidates all derived query keys
- **WHEN** `invalidateRecipeData(queryClient, recipeId)` is called
- **THEN** the following query keys SHALL be invalidated: `['recipe', recipeId]`, `['recipe', 'slug']`, `['recipe-items', recipeId]`, `['recipe-hints', recipeId]`, `['recipe-nutri-score', recipeId]`, `['recipe-nutrition-breakdown', recipeId]`, `['recipe-nutri-improvements', recipeId]`, `['recipes']`, `['my-recipes']`

#### Scenario: RecipeItem mutation refreshes all derived views
- **WHEN** `useCreateRecipeItem`, `useUpdateRecipeItem`, or `useDeleteRecipeItem` completes successfully
- **THEN** the mutation's `onSuccess` callback SHALL call `invalidateRecipeData(queryClient, recipeId)`
- **THEN** the Recipe detail page SHALL re-fetch nutritional breakdown, hints, nutri-score, and improvements without a manual page reload

#### Scenario: Recipe-level mutation refreshes all derived views
- **WHEN** a Recipe-level mutation (`useUpdateRecipe`, fork, visibility change) completes successfully
- **THEN** the mutation's `onSuccess` callback SHALL call `invalidateRecipeData(queryClient, recipeId)`
