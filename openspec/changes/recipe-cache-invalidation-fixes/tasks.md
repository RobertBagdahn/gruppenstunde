# Implementation Tasks

## 1. Backend — Extended signal coverage
- [x] 1.1 In `backend/recipe/signals.py`, add `post_delete` receiver for `supply.Ingredient` that reuses the existing recipe-lookup logic (direct FK + via Portion) and calls `recalculate_recipe_cache` per affected Recipe.
- [x] 1.2 Add `post_save` and `post_delete` receivers for `supply.Portion`. Lookup: `RecipeItem.objects.filter(portion=instance).values_list("recipe_id", flat=True)`. Recalc per affected Recipe.
- [x] 1.3 Add `post_save` receiver for `supply.MeasuringUnit`. Lookup: union of `RecipeItem.filter(measuring_unit=instance)` and `RecipeItem.filter(portion__measuring_unit=instance)`. Recalc per affected Recipe.
- [x] 1.4 Extract the recipe-lookup logic for Ingredient into a private helper `_recipes_using_ingredient(ingredient)` to share between `post_save` and `post_delete` handlers.
- [x] 1.5 Add inline code comment explaining the synchronous-recalc trade-off and when to switch to a lazy `cached_at = NULL` strategy (threshold: >100 affected recipes per operation).

## 2. Backend — Suggestion cache key versioning
- [x] 2.1 In `backend/recipe/services/suggestion_service.py`, change the cache key construction to include `int(recipe.cached_at.timestamp())` if set, else `0`.
- [x] 2.2 Verify the `objective` hash continues to be part of the key (no regression).
- [x] 2.3 Keep the existing 24h TTL unchanged.

## 3. Backend — Tests
- [x] 3.1 In `backend/recipe/tests/test_cache_signals.py`, add test: deleting an Ingredient used by a Recipe triggers cache recalculation.
- [x] 3.2 Add test: saving a Portion with changed `weight_g` triggers cache recalculation for recipes using that Portion.
- [x] 3.3 Add test: deleting a Portion triggers cache recalculation for recipes that referenced it.
- [x] 3.4 Add test: saving a MeasuringUnit with changed `quantity` triggers cache recalculation for recipes whose Portions use it.
- [x] 3.5 Add test (in a suitable test module for `suggestion_service`): cache key for the same recipe differs after `recalculate_recipe_cache` has been called (mock `cache.set`/`cache.get` or inspect the key directly).
- [x] 3.6 Run `uv run python manage.py test recipe` and ensure all tests pass.

## 4. Frontend — Invalidation helper
- [x] 4.1 In `frontend/src/api/recipes.ts`, add `export function invalidateRecipeData(queryClient: QueryClient, recipeId: number): void` that invalidates: `['recipe', recipeId]`, `['recipe', 'slug']`, `['recipe-items', recipeId]`, `['recipe-hints', recipeId]`, `['recipe-nutri-score', recipeId]`, `['recipe-nutrition-breakdown', recipeId]`, `['recipe-nutri-improvements', recipeId]`, `['recipes']`, `['my-recipes']`.
- [x] 4.2 Refactor `useCreateRecipeItem`, `useUpdateRecipeItem`, `useDeleteRecipeItem` to call `invalidateRecipeData` in `onSuccess` instead of individual `invalidateQueries` calls.
- [x] 4.3 Refactor `useUpdateRecipe` and the other Recipe-level mutations (fork, visibility) in `api/recipes.ts` to call `invalidateRecipeData`.
- [x] 4.4 Audit remaining `queryClient.invalidateQueries({ queryKey: ['recipe', ...] })` usages in `api/recipes.ts` and ensure all Recipe/RecipeItem mutations go through the helper.

## 5. Frontend — Tests
- [x] 5.1 Add a unit test for `invalidateRecipeData` using a mocked `QueryClient`, asserting all expected keys are invalidated.
- [x] 5.2 Run the frontend test suite and ensure no regressions.

## 6. Manual verification
- [ ] 6.1 Start backend + frontend locally. On a Recipe detail page, add a RecipeItem and verify that Nährwert-Breakdown, Nutri-Score, Hints, and Improvements update without page reload.
- [ ] 6.2 Open Django admin, change `Portion.weight_g` for a Portion used in a Recipe. Reload the Recipe detail page and verify `cached_price_total` and nutritional values have changed.
- [ ] 6.3 Trigger LLM suggestions for a Recipe, note the result. Add a RecipeItem, then request suggestions again with the same objective — verify a fresh LLM call occurs (logs / different result).

## 7. Finalisation
- [x] 7.1 Run `openspec validate recipe-cache-invalidation-fixes --strict` and fix any issues.
- [ ] 7.2 Commit with conventional message: `fix(recipe): invalidate derived caches consistently on upstream changes`.
