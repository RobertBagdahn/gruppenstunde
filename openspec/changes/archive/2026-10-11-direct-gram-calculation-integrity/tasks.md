## 1. Backend model and contract

- [x] 1.1 Add an optional direct `Ingredient` relation to `RecipeItem` and create a migration without auto-linking existing notes.
- [x] 1.2 Add shared RecipeItem ingredient/weight resolution helpers and use direct grams as stored weight.
- [x] 1.3 Extend RecipeItem create/update/read contracts, validate active ingredients, and reject portion/ingredient mismatches.
- [x] 1.4 Keep ingredient usage counts and recipe cache invalidation correct for direct ingredient references.

## 2. Calculations and exports

- [x] 2.1 Include linked direct-gram items in recipe weight, nutritional values, nutrition breakdown, cached price, and nutritional tag synchronization.
- [x] 2.2 Include linked direct-gram items in active recipe resolution, meal-plan nutrition and cost, variant calculations, and shopping-list quantities, price estimates, and source attribution.
- [x] 2.3 Include direct-gram ingredients in cooking schedules, meal-plan PDF output, recipe PDF labels, allergen collection, and recipe-step resolution.

## 3. Food frontend

- [x] 3.1 Extend Food-Frontend recipe item mutation payloads to preserve the ingredient ID for direct-gram items.
- [x] 3.2 Run Food-Frontend typecheck and relevant tests. (2026-10-11: `tsc -b` clean, `vitest run` 1030/1030 passed)

## 4. Tests and verification

- [x] 4.1 Add tests for recipe nutrition/weight, nutrition breakdown, active calculation resolution, shopping-list aggregation/pricing/source, and recipe PDF display.
- [x] 4.2 Run focused backend tests, full backend pytest suite, and required backend checks.
- [x] 4.3 Run relevant Food-Frontend tests and inspect the final diff. (2026-10-11: WP-02 follow-up merged; Food-Frontend suite green.)
- [ ] 4.4 Browser-verify that recipe step chips and the recipe PDF display the same scaled amounts as the ingredient table. The available food-recipe-wizard report documents the pre-fix defect but does not include post-fix browser evidence.

## 5. Review follow-up (WP-02)

- [x] 5.1 Recipe fork copies `ingredient_id` and the preparation steps including remapped step-ingredient links and `{recipe_item_id}` placeholders (`copy_recipe_steps`).
- [x] 5.2 Shopping list from a recipe filters inactive items first and resolves direct-gram ingredients via `get_recipe_item_ingredient`.
- [x] 5.3 Step ingredients expose the ingredient name/ID for portion and direct-gram items; chips and recipe PDF use the shared amount formatter.
- [x] 5.4 Regression tests in `backend/recipe/tests/test_quantity_integrity_regressions.py` (fork, steps, recipe shopping list, step schema, review rank).
