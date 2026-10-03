# Food Release Hardening

## Why

Peter’s production session on 2026-10-02 exposed two distinct classes of release regressions: the Buffet entry point produced no observable backend request, while recipe editing returned HTTP 500 when Cloud SQL ran out of connection slots. Recipe-item changes also triggered embedding errors for items with no portion, which the API can currently persist and display only as “Zutat”. Cloud Run concurrency and persistent Django connections exceed the capacity of the deployed `db-f1-micro`, and the PR pipeline does not check `frontend-food` or exercise these workflows end to end.

## What Changes

- Bound aggregate Cloud Run/Gunicorn database connections below the configured Cloud SQL budget, shorten or pool persistent connections, and monitor saturation; reduce peak memory in ingredient-statistics distribution endpoints and align AI-interaction daily timelines with Django's configured timezone.
- Allow eligible draft ingredients to be used as recipe alternatives. Make alternative creation atomic and validate that an alternative has a valid portion belonging to its ingredient; prevent silent nameless recipe items.
- Make buffet opening and save failures observable and retryable in the Food UI.
- Preserve HTTP status and structured error codes in Food API errors. Show safe German feedback for server errors (including HTTP 500) without exposing tracebacks, and provide retry where the operation is safe to retry.
- Add deterministic browser regressions for buffet opening/save and draft-ingredient alternatives, and include `frontend-food` quality checks and critical Food E2E tests in release/PR verification.

## Capabilities

### New Capabilities

- `food-runtime-capacity`: Bound and observe backend database-connection and memory use against deployed Cloud Run and Cloud SQL capacity.

### Modified Capabilities

- `food-api-contracts`: Preserve structured status/error information and show safe, actionable 5xx feedback in the Food frontend.
- `buffet-builder`: Verify the user-visible builder entry, successful persistence, and recoverable failures.
- `recipe-exchanges`: Permit eligible draft ingredients and make alternative membership/portion persistence safe and atomic.
- `recipe-creation-roundtrip-integrity`: Keep recipe mutations and embedding generation safe for legitimate portionless direct-gram items.
- `food-e2e-regression-suite`: Cover the reported Food flows with deterministic browser tests and fail on their API errors.
- `food-release-integrity`: Require Food-frontend checks and critical regression tests before release.

## Impact

- Backend: `backend/inspi/settings/production.py`, Cloud Run/Cloud SQL settings in `terraform/`, ingredient-statistics and AI-interaction statistics APIs, Food error handling, recipe exchange/item APIs, and embedding generation.
- Food frontend: shared API error parsing, `frontend-food/src/api/recipes.ts`, ingredient/alternative selection, buffet entry points and `BuffetBuilder`.
- Verification/deployment: `cloudbuild-pr.yaml`, relevant backend/frontend tests, and `e2e/` Playwright fixtures/specs. No product-data migration is expected unless an invariant inspection finds existing malformed RecipeItems that require a separately approved repair.
