## Context

The `e2e` package currently runs a single mobile Chromium project and contains authentication, recipe search, recipe creation smoke checks, and recipe ingredient-editing regressions. It has no shared authenticated fixture, no `baseURL`, no deterministic server-state cleanup, and no standard strategy for external AI/import dependencies. The active Food changes require browser verification across several resources whose data is linked:

```text
Ingredient -> Recipe -> MealPlan -> ShoppingList
     \----------------------> ShoppingList
```

The suite must protect persisted behavior, not just page rendering. It also has to coexist with the existing local startup script, session-cookie authentication, PostgreSQL-backed data, TanStack Query caching, and the shopping-list WebSocket.

## Goals / Non-Goals

**Goals:**

- Provide reusable Playwright fixtures for authenticated contexts, isolated local state, deterministic resource naming, request assertions, and cleanup.
- Cover authenticated create, update, reload, permission, validation, and delete flows for Ingredients, Recipes, MealPlans, and ShoppingLists.
- Verify linked data roundtrips from recipes and meal plans into persistent shopping lists.
- Make AI and URL-import tests deterministic through request interception in the default project.
- Test recipe ingredient/metadata/step persistence, serving normalization, and duplicate-save protection.
- Test meal-plan default meal times, responsive fields, manual norm-portions behavior, and settings persistence.
- Test mobile baseline and desktop layout contracts without depending on screenshots as the primary assertion.
- Ensure failures in the flow under test are not hidden by broad console-error filters or conditional skips.

**Non-Goals:**

- No live Gemini, Chefkoch, Open Food Facts, REWE, or other external network dependency in the required default suite.
- No replacement of backend unit/integration tests with Playwright tests.
- No WebSocket protocol certification in the first iteration; regular shopping-list tests may stub or tolerate the connection, while a dedicated realtime project can be added later.
- No production-only test user or permanent production data.
- No database migration for E2E support.

## Decisions

### 1. Use shared fixtures with API-driven cleanup

Add typed fixtures under `e2e/fixtures/` and use Playwright `storageState` or an authenticated context to avoid repeating UI login in every test. Resource names receive a test-specific suffix. Cleanup uses the authenticated `page.request` client in reverse dependency order: shopping lists, meal plans, recipes, then ingredients.

The fixture must clear `localStorage` before navigation so the meal-plan wizard's `meal-plan-wizard` state cannot leak between tests. Cleanup is best-effort but must report failures rather than silently masking them.

Alternative: keep the shared seed admin and leave created rows in the database. Rejected because data accumulation makes list assertions non-deterministic and eventually affects authorization and uniqueness behavior.

### 2. Separate deterministic mocked and live-persistence projects

The default project uses deterministic request interception for AI creation, enhanced URL import, external parsing failures, and selected list/search responses. A live-persistence project runs against the local backend/frontend and verifies actual CRUD/reload behavior using fixture-created resources. The live project does not call external AI services.

Alternative: mock the entire backend for every test. Rejected because it cannot prove API response parsing, permission enforcement, database persistence, or cross-resource calculations. Alternative: use live AI/import calls. Rejected because latency, credentials, and external markup make required CI tests flaky.

### 3. Assert request contracts and visible persisted state together

Mutation tests capture the relevant request using `page.waitForRequest` or route handlers and assert the request body against the Pydantic/Zod contract. They then wait for the UI response and reload the URL-driven detail page to verify authoritative persisted data. Tests must not rely on arbitrary `waitForTimeout` calls where a request, response, URL, or visible state can be awaited.

The suite will use semantic selectors where available and add narrowly scoped `data-testid`/ARIA attributes only for controls that are otherwise ambiguous, including destructive menu actions and repeated save buttons.

### 4. Keep core tests independent and use explicit cross-domain tests

Ingredient, recipe, meal-plan, and shopping-list CRUD tests are independent. Cross-domain tests intentionally create the minimum dependency graph and assert provenance and quantity calculations:

```text
recipe ingredients
      │
      ├── recipe export ────────▶ persistent shopping list
      │
meal plan + meal item ──────────▶ persistent shopping list
```

This prevents a failure in one resource's CRUD test from hiding another resource's behavior while still protecting the business-critical integrations.

### 5. Treat active OpenSpec contracts as test targets, not implementation assumptions

The recipe suite will cover manual, AI, and URL-import draft roundtrips, step save-on-navigation, exact-once ingredient saves, and serving normalization. The meal-plan suite will cover responsive time fields and event-linked manual norm portions. Tests for behavior not yet implemented remain tasks in this change and must not be weakened into page-load checks.

### 6. Use viewport projects for responsive contracts

Retain a 375px mobile project and add a 320px mobile baseline plus a desktop project. Responsive tests assert no horizontal overflow, visible complete time values, expected mobile action bars, and desktop sidebars. Screenshots may aid debugging but are not the contract.

### 7. Keep realtime behavior out of ordinary shopping assertions

The shopping-list detail page opens a WebSocket. Standard CRUD tests assert REST mutations and persisted reload state, while stubbing or closing the socket where possible. A separate realtime test may be introduced only when a deterministic WebSocket fixture exists.

## Risks / Trade-offs

- **[Risk] Existing UI controls lack stable accessible names.** → Add minimal semantic labels/test IDs as part of the implementation and scope locators to the active dialog/card.
- **[Risk] Cleanup can fail when dependent rows prevent deletion.** → Delete resources in dependency order and surface cleanup failures in fixture teardown; never silently reuse polluted data.
- **[Risk] Backend/frontend schemas drift while tests are added.** → Assert representative request/response fields and update Pydantic/Zod schemas together when a mismatch is found.
- **[Risk] Existing active changes alter labels or persistence semantics.** → Tie selectors and assertions to the current OpenSpec contract and update the test artifacts before implementation if a requirement changes.
- **[Risk] Browser tests become slow if every test creates a full recipe wizard.** → Use API-created fixtures for setup where the behavior under test is not creation, and reserve full UI creation for dedicated creation-flow tests.
- **[Trade-off] Mocked import/AI tests do not validate provider availability.** → Keep optional live smoke tests separate from required CI coverage.
- **[Trade-off] REST-focused shopping tests do not prove WebSocket synchronization.** → Explicitly defer realtime protocol coverage until deterministic multi-context infrastructure is available.

## Migration Plan

1. Add shared E2E fixtures, typed API helpers, test-data naming, cleanup, and browser projects without changing application data models.
2. Stabilize existing authentication and recipe selectors, then add independent Ingredient, Recipe, MealPlan, and ShoppingList CRUD specs.
3. Add deterministic mocked AI/import scenarios and cross-domain export tests.
4. Add responsive viewport assertions and remove broad error filtering/skips from the flows under test.
5. Run the local startup script, relevant mocked/live Playwright projects, Food frontend checks, and backend contract tests.

Rollback is limited to removing or disabling the new E2E projects/specs. No production migration or data rollback is required.

## Open Questions

- Should the live-persistence project use the existing seed admin or a dedicated test user created through a test-only setup command?
- Can all cleanup operations use existing owner APIs, or is a narrowly scoped test-only cleanup endpoint required for resources that become linked?
- Should optional live AI/import tests run in a separate Playwright project locally only, or be exposed as an explicit CI job with credentials?
- Which existing recipe workflow tests should be replaced versus retained during implementation to avoid duplicate runtime and conflicting assumptions?
