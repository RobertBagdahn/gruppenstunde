## 1. E2E Infrastructure

- [x] 1.1 Add typed Playwright fixtures for authenticated browser contexts, API requests, isolated local storage, deterministic resource names, and reverse-order cleanup under `e2e/fixtures/`.
- [x] 1.2 Add reusable request/response helpers for CSRF/session handling, JSON payload assertions, API resource setup, and cleanup without TypeScript `any`.
- [x] 1.3 Update `e2e/playwright.config.ts` with a shared `baseURL`, 320px, 375px, tablet, and desktop projects, explicit project selection, and stable artifact output.
- [x] 1.4 Update `e2e/package.json` scripts and local test documentation for mocked, live-persistence, and optional external smoke projects.
- [x] 1.5 Remove broad console-error filtering, arbitrary waits, and critical-path `test.skip` behavior from the tests covered by this change.

## 2. Backend and Frontend Contract Preparation

- [x] 2.1 Review the recipe import Pydantic and Zod contracts for `tag_ids`, `source_url`, `servings`, and nullable fields; align both sides where the E2E request assertions expose a mismatch.
- [x] 2.2 Ensure recipe wizard metadata persistence includes summary and description in the update payload and add/update any required frontend types.
- [x] 2.3 Ensure URL-import confirmation preserves source URL and supported tag/scout metadata in the created recipe payload.
- [x] 2.4 Add stable accessible names or narrowly scoped `data-testid` attributes for ingredient destructive actions, meal-plan menus, shopping-list delete actions, and repeated save controls.
- [x] 2.5 Verify no database migration is required; if test setup requires a new persisted field, add a separate migration and synchronized Pydantic/Zod changes before E2E implementation.

## 3. Ingredient E2E Coverage

- [x] 3.1 Add authenticated manual Ingredient creation, generic-name warning, preview, detail navigation, and reload assertions.
- [x] 3.2 Add Ingredient description update and permission-driven edit/delete control assertions using server-provided `can_edit` and `can_delete`.
- [x] 3.3 Add Ingredient portion and package create/update/delete roundtrip coverage with exact request payload assertions.
- [x] 3.4 Add Ingredient deletion-conflict coverage that verifies the German conflict message and preserves the referenced Ingredient.
- [x] 3.5 Add URL-state search/filter/pagination coverage for the Ingredient list page.

## 4. Recipe E2E Coverage

- [x] 4.1 Stabilize the manual recipe wizard selectors and add a full manual creation roundtrip covering ingredients, metadata, preparation steps, preview, detail reload, and deletion.
- [x] 4.2 Add exact-once ingredient save coverage for repeated clicks, multiple additions, updates, deletions, reload persistence, and normalized portions.
- [x] 4.3 Add preparation-step save-on-navigation coverage, including failed batch save, preserved local edits, retry, and exactly one successful batch request.
- [x] 4.4 Add deterministic AI-create coverage using intercepted `/api/recipes/ai-create/`, followed by manual ingredient/step edits and reload verification.
- [x] 4.5 Add deterministic enhanced URL-import preview/confirmation coverage with servings normalization, imported steps, source URL, tags, and classified error responses.
- [x] 4.6 Add serving-context coverage for one, four, and 100-person inputs, no-double-scaling, save confirmation, cancellation, and reload roundtrips.
- [x] 4.7 Add recipe detail permission, delete-conflict, shopping-export, PDF-dialog, and URL-driven search/filter assertions.

## 5. MealPlan E2E Coverage

- [x] 5.1 Add empty MealPlan wizard creation coverage with deterministic date/time values, strategy selection, reload persistence, and cleanup.
- [x] 5.2 Add custom default meal-time coverage in the wizard and settings panel, including creation of a meal using configured defaults.
- [x] 5.3 Add responsive meal-time assertions at 320px, tablet, and desktop widths with no horizontal overflow.
- [x] 5.4 Add event-linked manual norm-portion coverage for enable, positive whole-number validation, persistence, participant/activity stability, and automatic reset.
- [x] 5.5 Add standalone-plan coverage proving event-only manual norm-portion controls are absent and direct portions remain editable.
- [x] 5.6 Add meal/day/item mutation coverage for add, update, remove, duplicate prevention, validation errors, and permission states.
- [x] 5.7 Add MealPlan shopping export, PDF, cooking-schedule, and URL-tab persistence assertions.

## 6. ShoppingList E2E Coverage

- [x] 6.1 Add owner ShoppingList create, item add, check/uncheck, rename, reload, progress, and delete roundtrip coverage.
- [x] 6.2 Add optimistic item-check rollback coverage for failed PATCH responses and visible German error feedback.
- [x] 6.3 Add owner/admin/editor/viewer permission coverage for list, item, collaborator, rename, and delete actions.
- [x] 6.4 Add deterministic recipe and MealPlan export coverage with source provenance, scaled quantities, direct ingredients, and reference-meal exclusion.
- [x] 6.5 Add URL-state search and pagination coverage for ShoppingLists and assert the intended behavior of local-only sort/owner filters.
- [x] 6.6 Stub or isolate the shopping-list WebSocket in ordinary tests and document a separate realtime test boundary.

## 7. Cross-Domain and Regression Verification

- [x] 7.1 Add a chained Recipe -> MealPlan -> persistent ShoppingList scenario with recipe/meal provenance and quantity assertions.
- [x] 7.2 Add permission and unauthenticated regression scenarios for all four Food resources, asserting 403/404 behavior and no data leakage.
- [x] 7.3 Add deterministic import/AI error matrix coverage for invalid URL, unreachable source, unavailable AI, and no recipe found.
- [x] 7.4 Add mobile/desktop visibility assertions for recipe action bar/sidebar and core list/detail layouts.
- [x] 7.5 Replace overlapping legacy recipe smoke scenarios or align them with the new fixtures so the suite has one authoritative assertion for each integrity contract.

## 8. Verification and Documentation

- [x] 8.1 Run the mocked Playwright project and live-persistence Playwright project against the local startup script.
- [x] 8.2 Run Food frontend typecheck, lint, unit/component tests, and relevant backend API/contract tests.
- [x] 8.3 Run `uv run python manage.py makemigrations --check` and confirm no unintended migration is introduced.
- [x] 8.4 Document local prerequisites, server startup, test project selection, cleanup behavior, and optional external smoke credentials.
- [x] 8.5 Review the final test report for skipped critical tests, hidden request failures, leaked resources, and flaky fixed waits.
