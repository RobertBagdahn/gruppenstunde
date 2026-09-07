## 1. Backend Security And Calculation

- [x] 1.1 Enforce recipe export authorization through the Food access policy.
- [x] 1.2 Enforce MealPlan access before persistent shopping-list generation.
- [x] 1.3 Reuse canonical active RecipeItem selection for direct recipe exports.
- [x] 1.4 Preserve unresolved units and quantities instead of misleading zero-gram output.
- [x] 1.5 Verify servings, factors, overrides, reserve, and variant calculations remain consistent.

## 2. Shopping Persistence And API Contracts

- [x] 2.1 Store recipe, meal, and ingredient provenance without sentinel IDs.
- [x] 2.2 Persist direct and recipe sources with correct relations and cached labels.
- [x] 2.3 Reject negative quantities at schema and database boundaries.
- [x] 2.4 Reject unknown ingredient and retail-section IDs.
- [x] 2.5 Make recipe and MealPlan shopping-list creation atomic.

## 3. Views, Ordering, And Exports

- [x] 3.1 Group by-source views from persisted source records.
- [x] 3.2 Use database-backed retail-section ordering.
- [x] 3.3 Preserve server section order in the Food frontend.
- [x] 3.4 Use edited item names in REWE/external exports.

## 4. Frontend Synchronization

- [x] 4.1 Synchronize Pydantic response/input schemas.
- [x] 4.2 Synchronize Food Zod schemas and API types.
- [x] 4.3 Render provenance, unresolved quantities, edited names, and ordering correctly.

## 5. Verification

- [x] 5.1 Add authorization regression tests.
- [x] 5.2 Add variant, quantity, portion, factor, and reserve calculation tests.
- [x] 5.3 Add provenance persistence tests.
- [x] 5.4 Add invalid quantity and foreign-key validation tests.
- [x] 5.5 Add source-view, ordering, and external-export tests.
- [x] 5.6 Run `uv run python manage.py makemigrations --check`.
- [x] 5.7 Run the full backend suite, Food frontend tests, and Food production build.
