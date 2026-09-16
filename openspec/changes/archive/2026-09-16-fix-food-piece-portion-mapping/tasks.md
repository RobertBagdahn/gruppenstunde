## 1. Portion Model And Resolver

- [x] 1.1 Add portion weight provenance/status fields and migration-safe defaults to `backend/supply/models/ingredient.py` and expose them through `backend/supply/schemas/ingredients.py`.
- [x] 1.2 Implement a central piece-like portion classifier and trusted-weight resolver in `backend/supply/services/`.
- [x] 1.3 Replace silent unknown-unit and implicit `1 g` fallbacks in URL import, text import, AI recipe creation and ingredient enrichment.
- [x] 1.4 Add the authenticated portion confirmation/create endpoint with duplicate-name, permission and referenced-portion safeguards.
- [x] 1.5 Add backend tests for known portions, unknown pieces, competing AI estimates, confirmation, rejected proposals and referenced portions.

## 2. Recipe And Calculation Integration

- [x] 2.1 Extend recipe import, AI estimation and RecipeItem response schemas with proposal/status fields.
- [x] 2.2 Update nutrition, price, recipe-cache, meal-plan and shopping calculations to distinguish confirmed weights from unresolved piece weights.
- [x] 2.3 Ensure portion changes preserve technical gram totals and create new portions instead of mutating referenced definitions.
- [x] 2.4 Add cross-consumer regression tests for recipe detail, nutrition, prices, meal plans and shopping lists.

## 3. Food Frontend

- [x] 3.1 Synchronize `frontend-food` Zod schemas and API hooks with portion status and weight proposal contracts.
- [x] 3.2 Update the recipe wizard, quantity dialog and inline editor to show named piece portions, proposals and mandatory confirmation.
- [x] 3.3 Add UI for choosing an existing portion or confirming a new size-specific portion.
- [x] 3.4 Show technical gram equivalents only when trusted and visibly warn for unresolved weights.
- [x] 3.5 Add component and workflow tests for piece sizes, confirmation, rejection and saved quantities.

## 4. Verification And Migration

- [x] 4.1 Add data migration/backfill logic that marks only unambiguous existing portion weights as trusted without changing recipe references.
- [x] 4.2 Run `uv run python manage.py makemigrations --check` and targeted backend tests.
- [x] 4.3 Run Food frontend typecheck, lint and relevant Vitest tests.
- [x] 4.4 Verify Pydantic/Zod contract tests and document any intentionally unresolved legacy data for `repair-food-portion-data`.
