## 1. Price Proposal Backend

- [x] 1.1 Add `IngredientPriceProposal` model, status/provenance fields, indexes and migration.
- [x] 1.2 Implement centralized missing-price semantics treating `NULL` and `0` as missing.
- [x] 1.3 Add structured Gemini price proposal service with confidence, rationale and source metadata.
- [x] 1.4 Add create/list/accept/reject APIs with permission checks, locking, positive-price protection and idempotency.
- [x] 1.5 Invalidate or recalculate affected recipe and meal-plan caches after acceptance.
- [x] 1.6 Add backend tests for proposal lifecycle, unauthorized access, zero prices, positive-price protection and cache invalidation.

## 2. API Contracts And Coverage

- [x] 2.1 Extend ingredient, recipe cost and meal-plan cost Pydantic schemas with proposal/provenance/coverage fields.
- [x] 2.2 Update all price consumers (`recipe_checks`, planner, shopping and data quality) to use the centralized missing-price helper.
- [x] 2.3 Add contract and cross-consumer tests for partial, complete and absent price coverage.

## 3. Food Frontend

- [x] 3.1 Add Zod schemas and TanStack Query hooks for price proposals and approval actions.
- [x] 3.2 Add proposal/approval UI to ingredient detail and data-quality price analysis.
- [x] 3.3 Show partial coverage and pending-price warnings in recipe and meal-plan cost views.
- [x] 3.4 Add confirmation/rejection feedback, retry/error states and frontend tests.

## 4. Verification

- [x] 4.1 Run targeted supply, recipe, planner and shopping price tests.
- [x] 4.2 Run backend migrations check and full schema contract tests.
- [x] 4.3 Run Food frontend typecheck, lint and relevant Vitest tests.
