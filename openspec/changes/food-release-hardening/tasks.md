## 1. Audit and define runtime budgets

- [x] 1.1 Read-only production inspection: Cloud SQL `max_connections=25`; Cloud Run max scale/concurrency `10/10`; Gunicorn `2×4`; background worker `1/process`; Django `CONN_MAX_AGE=60`. Current envelope is 100 sessions against an application budget of 14 (8 reserved); proposed `2×2`, `CONN_MAX_AGE=0` envelope is 8.
- [x] 1.2 Run the report-only production audit: 4 exchange groups, 8 findings (3 empty groups and 2 members without Portions); no production data changed.
- [x] 1.3 Identify the authoritative production Cloud Build trigger and Cloud Run ownership/drift behavior (only push-to-main is active; it auto-detects `cloudbuild.yaml`; its `inspi-dev` service account has only visible project-level `roles/storage.admin`, so nested-check submit permission requires an approved IAM change).

## 2. Bound backend connection and memory use

- [ ] 2.1 Align Terraform/deployment configuration, Cloud Run concurrency/scaling, Gunicorn capacity, Django connection lifetime, and background worker capacity with the approved Cloud SQL connection budget.
- [x] 2.2 Add automated validation/tests for the connection-budget calculation and ensure relevant deployed settings have one source of truth.
- [x] 2.3 Refactor ingredient-statistics distribution processing to avoid repeated full-dataset materialization while preserving response behavior.
- [x] 2.4 Add statistics parity tests and a representative concurrent-load/resource test; configure operational signals for connection saturation and memory pressure.

## 3. Make recipe alternatives safe for draft ingredients

- [x] 3.1 Add a typed backend API operation that atomically creates or reuses the exchange group, assigns member positions, and creates the alternative RecipeItem.
- [x] 3.2 Validate recipe edit permission, Ingredient visibility independent of draft status, active Portion ownership, positive quantity, and rollback behavior; add API tests for success and each failure case.
- [x] 3.3 Update Pydantic and Zod contracts for the alternative operation and ensure the response contains the persisted Ingredient name and Portion.
- [x] 3.4 Switch the Food recipe editor to the atomic operation, handle portion-request failures using the shared API error type, and preserve the pending selection on retry.
- [x] 3.5 Make embedding generation safe for legacy/direct-gram RecipeItems without a Portion, and add tests proving one malformed/portionless row cannot abort recipe embedding construction.
- [x] 3.6 Report-only production audit found 3 empty exchange groups and 2 exchange members without Portions. A separate reviewed data-repair plan is required; no repair or migration was run.

## 4. Surface Food API server errors safely

- [x] 4.1 Implement the standard safe Food API error response with stable error code and request correlation ID; keep tracebacks and SQL details only in server logs.
- [x] 4.2 Add backend tests for 4xx/5xx error serialization and correlation between the response reference and server log entry.
- [x] 4.3 Add a typed frontend API error that preserves HTTP status, code, and request ID even when the body is empty, malformed, or non-JSON.
- [x] 4.4 Update Food query/mutation UI to show German status-aware errors, safe retries for reads, explicit retries for mutations, and preserve user input after failure.
- [x] 4.5 Add frontend tests for JSON and non-JSON 500 responses, visible retry controls, and no automatic duplicate mutation retry.

## 5. Restore and test the Buffet workflow

- [x] 5.1 Trace both Buffet entry points through MealSlot and MealActionsMenu: both call the same open handler, and the builder receives the selected meal's plan and ID.
- [x] 5.2 Add explicit loading, empty, catalog-error, and retry states; keep template, selections, and role amounts after a failed save and close only on success.
- [x] 5.3 Add component tests for direct/menu entry wiring and error recovery, plus deterministic browser tests for Buffet persistence and draft-alternative retry/reload.

## 6. Make Food checks release-blocking

- [x] 6.1 Extend the authoritative PR Cloud Build trigger to lint release-touched `frontend-food` files, and run TypeScript, Vitest, and production build checks.
- [x] 6.2 Add deterministic mocked Playwright coverage for Buffet persistence, draft-Ingredient alternatives, and safe HTTP 500 feedback; ensure unexpected API errors fail tests.
- [x] 6.3 Keep backend pytest and existing quality gates required, and verify the configured deploy trigger cannot bypass failed Food checks (the active push-to-main pipeline invokes the PR checks before any build or deployment).
- [x] 6.4 Run backend tests, touched-file Food lint, TypeScript, Vitest, mocked Playwright, infrastructure validation, and strict OpenSpec validation; document that rollout remains blocked by the over-budget current runtime and audited malformed exchange data.
