## Why

The Food frontend currently has Playwright coverage mainly for authentication, recipe discovery, and a subset of recipe editing. The core user workflows for ingredients, meal plans, and shopping lists are not permanently protected, while existing recipe tests rely on live AI/external behavior, fixed waits, broad selectors, and skipped persistence checks. A stable, deterministic E2E foundation is needed now because the active recipe roundtrip, serving-context, meal-plan, and responsive-layout changes all depend on reliable browser-level verification.

## What Changes

- Add a permanent Food Playwright test capability covering authenticated CRUD roundtrips for ingredients, recipes, meal plans, and shopping lists.
- Add reusable Playwright fixtures for session setup, isolated browser state, deterministic test data, API assertions, and cleanup of created resources.
- Replace live AI and external URL dependencies in the default suite with deterministic API interception; keep optional live smoke coverage separate.
- Add recipe persistence tests for ingredients, metadata, preparation steps, repeated saves, reloads, URL imports, AI-created drafts, and serving normalization.
- Add meal-plan tests for creation, default meal times, responsive settings, manual norm portions, meal mutations, and shopping-list export.
- Add shopping-list tests for creation, item updates, optimistic rollback, ownership roles, reload persistence, and exports from recipes and meal plans.
- Add ingredient tests for creation, generic-name warnings, editing, portions/packages, permission states, and deletion conflicts.
- Assert relevant request payloads and persisted UI state instead of relying on arbitrary delays or broad console-error filtering.
- Add mobile and desktop Playwright projects so responsive contracts are tested at 320px, 375px, tablet, and desktop widths.

## Capabilities

### New Capabilities

- `food-e2e-regression-suite`: Deterministic, isolated browser coverage for core Food workflows and their cross-resource data roundtrips.

### Modified Capabilities

- `recipe-creation-wizard`: Add browser-level persistence requirements for manual, AI, and URL-import creation flows, including ingredients, metadata, preparation steps, and serving normalization.
- `meal-plan`: Add browser-level verification for creation, responsive meal-time settings, manual norm portions, and shopping-list export.
- `shopping-list-views`: Add browser-level verification for persistent list CRUD, item state changes, permissions, rollback feedback, and export flows.
- `ingredient-name-validation`: Add browser-level verification that generic-name warnings are visible but non-blocking during ingredient creation.

## Impact

- E2E infrastructure: `e2e/playwright.config.ts`, shared fixtures, test data helpers, request interception, cleanup, and package scripts.
- E2E scenarios: new or revised specs under `e2e/tests/` for ingredients, recipes, meal plans, shopping lists, permissions, exports, and responsive layouts.
- Food frontend selectors and accessibility attributes where existing controls are not reliably addressable, especially destructive actions and meal-plan menus.
- Food API and frontend contracts where tests expose mismatches between Pydantic responses and Zod schemas, including recipe import tags/source fields and meal-plan norm-portion state.
- Backend test setup or narrowly scoped test endpoints/fixtures only if deterministic browser setup cannot be achieved through existing authenticated APIs.
- No production database migration is expected for the E2E suite; any required test-only data setup must be isolated from production behavior.
