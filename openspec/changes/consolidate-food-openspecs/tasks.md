## 1. Contract Inventory

- [ ] 1.1 Inventory current backend model fields and legacy references to `servings`, `quantity_type`, and Supply inheritance in `backend/recipe`, `backend/supply`, and import commands.
- [ ] 1.2 Inventory planner calculation helpers and every endpoint that emits recipe preview, nutrition, cost, shopping-list, or cooking-plan values.
- [ ] 1.3 Inventory matching Food frontend Zod schemas and components under `frontend-food/src/`.

## 2. Backend Model And Migration

- [ ] 2.1 Confirm `supply.Ingredient` is standalone and remove any remaining Supply inheritance assumptions from model, admin, and service code.
- [ ] 2.2 Implement recipe portion normalization so persisted recipes use `portions=1` and RecipeItem quantities are implicitly per portion.
- [ ] 2.3 Remove obsolete `quantity_type` model/schema/import references and add a data migration or management command for legacy rows.
- [ ] 2.4 Run `uv run python manage.py makemigrations --check` and create required migrations only after the live model state is confirmed.

## 3. Planner Calculations And Search API

- [ ] 3.1 Make `effective_portions = override_portions or norm_portions` the shared source for quantity, nutrition, cost, shopping-list, and cooking-plan calculations.
- [ ] 3.2 Update recipe search, popular, recently-used, and suggestion response schemas to use `portions`, `image_url`, nullable preview fields, and the canonical price-per-serving formula.
- [ ] 3.3 Apply Meal-Plan nutritional tags as SQL-level exclusion filters before pagination/limits in recipe search and random suggestions.
- [ ] 3.4 Add backend tests for portion overrides, mixed effective portions, typed preview responses, missing prices, and exclusion tags.

## 4. Frontend Schema And UI

- [ ] 4.1 Update Food-frontend Zod schemas to mirror the backend recipe preview and Meal-Plan contracts exactly.
- [ ] 4.2 Update recipe import, recipe editing, and Cooklang import flows to omit `quantity_type` and display quantities as per-portion values.
- [ ] 4.3 Update RecipeSearchDialog and contextual suggestion UI to use exclusion semantics and consistent `portions`/`image_url` fields.
- [ ] 4.4 Add frontend tests for normalized portions, empty prices, excluded tags, and 320px layout behavior.

## 5. Spec Governance And Verification

- [ ] 5.1 Remove duplicate or superseded Food requirements from canonical specs while leaving archived changes unchanged.
- [ ] 5.2 Add cross-links from detailed Food specs to their single canonical owners instead of repeating formulas.
- [ ] 5.3 Run targeted OpenSpec validation for this change and `git diff --check`.
- [ ] 5.4 Run focused backend tests with `uv run` and frontend type/tests, then document any pre-existing validator failures.
