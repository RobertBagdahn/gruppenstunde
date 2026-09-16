## 1. Trusted Weight Foundation

- [x] 1.1 Add or finalize the typed trusted-weight/result contract in `backend/supply/services/portion_resolution.py`, including trusted status, unresolved status and a reason for missing weight.
- [x] 1.2 Replace all portion Repair/Rebind `weight_g or 1.0` fallbacks in `backend/supply/services/portion_integrity.py` and `backend/supply/services/portion_repair.py` with trusted-weight handling.
- [x] 1.3 Make normal portion create/update flows reject unconfirmed piece-like portions with HTTP 422 while preserving the explicit confirmation endpoint.
- [x] 1.4 Ensure unresolved piece portions never enter nutrition, price, planner or shopping technical gram calculations as fabricated values.
- [x] 1.5 Add any required additive migration or constraint for weight status/provenance; do not modify existing migrations.

## 2. Repair Workflow Consolidation

- [x] 2.1 Make repair findings with an untrusted source or target weight remain `pending_review` and prevent automatic RecipeItem movement.
- [x] 2.2 Integrate the legacy `repair_portion_integrity` command into the audit-aware `repair_portion_data` workflow or replace it with a delegating compatibility command.
- [x] 2.3 Preserve dry-run, confidence threshold, audit snapshots, rollback transaction boundaries and idempotent re-application in the unified command.
- [x] 2.4 Add backend integration tests for missing source weight, missing target weight, pending review, rollback and repeated apply.

## 3. Calculation Completeness And Price Semantics

- [x] 3.1 Define shared backend completeness structures for `complete`, `partial` and `missing` results, coverage percentage and affected item references.
- [x] 3.2 Extend recipe, planner and shopping Pydantic responses with completeness data and synchronize all consumers to omit unresolved technical values.
- [x] 3.3 Replace local price truthiness checks in data quality, breakfast catalog, ingredient statistics and other consumers with `is_missing_price()`/`price_or_none()`.
- [x] 3.4 Normalize `price_source` to `manual`, `ai_accepted` or `missing` in all Ingredient and Data-Quality responses.
- [x] 3.5 Add unit and integration tests for NULL, zero, negative, manual and accepted-AI prices, including cache recalculation.

## 4. PDF And Scaling Consistency

- [x] 4.1 Return HTTP 404 from the cooking-schedule PDF endpoint when the accessible MealPlan has no meals, and update the API test.
- [x] 4.2 Introduce one request-scoped scaling calculation for recipe PDF and cooking-schedule PDF quantities, costs, nutrition and structured steps.
- [x] 4.3 Preserve stored recipe portions and cached values during export; add regression tests with reserve factors and target servings.
- [x] 4.4 Update structured step placeholder resolution to support direct gram RecipeItems and isolate unknown placeholders without reverting the complete step to unscaled text.
- [x] 4.5 Add PDF integration assertions for direct grams, structured steps, step ingredients, costs, allergens and incomplete-weight warnings.

## 5. Material And Ingredient Replacement Safety

- [x] 5.1 Wrap recipe material update and delete in short transactions with recipe/link locking and permission checks.
- [x] 5.2 Reject duplicate, missing or foreign IDs in material reorder payloads with HTTP 400 before changing order.
- [x] 5.3 Make identical ingredient replacement an idempotent no-op without unnecessary cache recalculation.
- [x] 5.4 Validate automatic replacement rounding against a defined gram tolerance and return HTTP 422 with unchanged state when exceeded.
- [x] 5.5 Add integration tests for material concurrency/reorder validation and replacement metadata, idempotency, unsafe weights and rounding conflicts.

## 6. Contract Synchronization And Food UI

- [x] 6.1 Update affected Pydantic schemas for weight trust, calculation completeness, price source and PDF/error responses.
- [x] 6.2 Update matching Food Zod schemas and API hooks without TypeScript `any` types.
- [x] 6.3 Show unresolved-weight and incomplete-calculation warnings with affected item details in recipe, planner, shopping and PDF-related UI.
- [x] 6.4 Keep portion confirmation mandatory in editor and wizard flows, with German loading, error, retry and success feedback.
- [x] 6.5 Replace hardcoded warning palette classes in touched Food components with semantic design-system tokens.
- [x] 6.6 Add Vitest component and contract tests for the new statuses, warnings, confirmation blocking and error states.

## 7. Browser E2E Coverage

- [x] 7.1 Add Playwright configuration and deterministic Food test data/session setup using HTTP-only cookie authentication.
- [x] 7.2 Add an E2E flow for recipe wizard piece-portion confirmation at the 320px viewport.
- [x] 7.3 Add an E2E flow for ingredient price proposal approval and visible provenance/coverage feedback.
- [x] 7.4 Add an E2E flow for recipe materials CRUD/reorder and AI suggestion rejection without persistence.
- [x] 7.5 Add an E2E flow for ingredient replacement without duplicate items or exchange-group mutation.
- [x] 7.6 Add an E2E flow for recipe PDF servings and cooking-schedule empty-plan error handling.

## 8. Verification And Rollout

- [x] 8.1 Run targeted backend unit and integration tests for weight integrity and repair first.
- [x] 8.2 Run targeted PDF, price, material, replacement and schema-contract tests.
- [x] 8.3 Run Food frontend typecheck, lint, Vitest and Playwright tests at desktop and 320px viewport sizes.
- [x] 8.4 Run `uv run python manage.py makemigrations --check` and the full backend test suite.
- [x] 8.5 Run a production-like repair dry-run, review unresolved findings and document rollout/rollback results.
