## 1. Backend Model And Cache

- [x] 1.1 Add a cached recipe weight field to `backend/recipe/models/recipe.py` if no equivalent cached field exists.
- [x] 1.2 Create a Django migration with `uv run python manage.py makemigrations recipe`.
- [x] 1.3 Extend `recalculate_recipe_cache()` in `backend/recipe/services/recipe_checks.py` to store total recipe weight.
- [x] 1.4 Add a fallback helper for existing recipes without cached weight so planner aggregation remains correct before cache backfill.

## 2. Recipe Rule Evaluation

- [x] 2.1 Restrict `evaluate_recipe_rules(recipe)` to `recipe_type` values `warm_meal` and `cold_meal`.
- [x] 2.2 Return a non-error empty result for non-applicable recipe types with an applicability flag and German message if the response schema is extended.
- [x] 2.3 Add `price_total` and `weight_g` values to recipe rule evaluation.
- [x] 2.4 Ensure `nutri_class` still evaluates numerically and displays as A-E.
- [x] 2.5 Update `backend/recipe/schemas/nutrition.py` for any new optional response fields.

## 3. Planner Aggregation And Suggestions

- [x] 3.1 Extend `_aggregate_meal_values()` in `backend/recipe/services/nutrition_aggregation.py` to include `weight_g` and reliable `price_total` values.
- [x] 3.2 Ensure `_aggregate_day_values()` includes all meal types and aggregates `weight_g`, `price_total`, nutrition values, and average `nutri_class`.
- [x] 3.3 Ensure `_aggregate_meal_plan_values()` includes all plan meals and exposes values needed by `scope="meal_event"` rules.
- [x] 3.4 Update `backend/recipe/services/suggestion_service.py` so rule suggestions for price, weight, Nutri-Score, and nutrition parameters format clear German messages.
- [x] 3.5 Preserve authorization behavior for `GET /api/meal-plans/{id}/suggestions/`.

## 4. Seed Rules

- [x] 4.1 Extend `backend/recipe/management/commands/seed_rules.py` with recipe-scope rules for price, weight, Nutri-Score, energy, protein, fat, saturated fat, sugar, sodium or salt, and fibre.
- [x] 4.2 Extend meal-scope rules for price, weight, Nutri-Score, energy, protein, sugar, fibre, saturated fat, and sodium or salt.
- [x] 4.3 Extend day-scope rules for daily price, daily weight, average Nutri-Score, energy, protein, fibre, sugar, saturated fat, sodium or salt, fat, and carbohydrates.
- [x] 4.4 Extend meal_event-scope rules for average daily price, average Nutri-Score, daily energy, protein, sugar, and fibre.
- [x] 4.5 Keep seeding idempotent and avoid duplicate Rule rows.

## 5. Frontend Recipe Rules UI

- [x] 5.1 Update `frontend-food/src/schemas/recipe.ts` to match any new `RecipeRules` response fields.
- [x] 5.2 Pass `recipe.recipe_type` from `RecipeDetailPage.tsx` into `RecipeRulesBox.tsx` or derive applicability from API response.
- [x] 5.3 Show the German non-applicable hint for recipe types other than `warm_meal` and `cold_meal`.
- [x] 5.4 Keep the expandable rule list for applicable recipe types, including counters and tips.
- [x] 5.5 Ensure UI text uses real German umlauts.

## 6. Frontend Planner Suggestions And Admin

- [x] 6.1 Update `frontend-food/src/schemas/suggestions.ts` if suggestion fields change.
- [x] 6.2 Verify `SuggestionDashboard.tsx` and `SuggestionCard.tsx` display price, weight, Nutri-Score, and nutrition suggestions clearly.
- [x] 6.3 Update `RuleTab.tsx` and `RuleEditDialog.tsx` so admins can select and understand `price_total`, `weight_g`, and `nutri_class`.
- [x] 6.4 Add UI hints that recipe-scope rules apply only to Kalte and Warme Mahlzeit, while planner scopes apply to all meal types.

## 7. Tests And Verification

- [x] 7.1 Add backend tests for `evaluate_recipe_rules()` on `warm_meal`, `cold_meal`, and non-applicable recipe types.
- [x] 7.2 Add backend tests for recipe price, weight, and Nutri-Score rule evaluation.
- [x] 7.3 Add backend tests for meal/day/meal_event aggregations including all meal types.
- [x] 7.4 Add backend tests for seeded rule idempotency and required default rule coverage.
- [x] 7.5 Run `uv run pytest recipe/tests/test_recipe_rules.py`.
- [x] 7.6 Run relevant planner and recipe aggregation tests with `uv run pytest`.
- [x] 7.7 Run frontend typecheck/build for `frontend-food`.

## 8. Documentation And Conventions

- [x] 8.1 Update `backend/AGENTS.md` if new rule parameter conventions need to be documented.
- [x] 8.2 Update `frontend/AGENTS.md` or `AGENTS.md` only if cross-project conventions change.
- [x] 8.3 Confirm Pydantic and Zod schemas are synchronized before implementation is marked complete.
