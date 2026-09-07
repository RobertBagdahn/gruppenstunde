## 1. Backend Import Contract and Parsing

- [x] 1.1 Add fixture-based tests for JSON-LD recipe extraction covering servings, ingredients, steps, image, and ISO durations in `backend/recipe/tests/`.
- [x] 1.2 Fix and harden `backend/recipe/services/import_service.py` field handling, JSON-LD graph/list parsing, microdata parsing, and supported Chefkoch fallback extraction.
- [x] 1.3 Make `backend/recipe/services/url_import_service.py` consume the normalized parser result without losing servings, steps, notes, or source URL.
- [x] 1.4 Align `backend/recipe/schemas/import_schemas.py` and related response schemas with the canonical enhanced import contract, including nullability and `servings`.
- [x] 1.5 Add backend API tests for successful enhanced import, no-recipe, blocked-source, malformed URL, and complete Chefkoch fixture responses.

## 2. Backend Recipe Persistence Integrity

- [x] 2.1 Audit recipe item create/update/delete endpoints and add regression tests for multi-item saves, repeated requests, and exact-once persisted RecipeItems.
- [x] 2.2 Ensure multi-item ingredient mutations are transactionally safe and return authoritative item data without replaying completed operations.
- [x] 2.3 Verify recipe-step batch replacement is atomic, validates recipe item references, and preserves the submitted instruction text across reloads.
- [x] 2.4 Add backend tests for AI-created drafts and URL-created drafts retaining manual recipe metadata, recipe items, and steps.

## 3. Frontend API and State Contracts

- [x] 3.1 Update `frontend-food/src/api/recipeImport.ts`, `frontend-food/src/api/recipes.ts`, and related Zod schemas to match backend Pydantic import and recipe-step contracts.
- [x] 3.2 Add a recipe-step editor save handle or equivalent promise-based callback so `RecipeWizard` can await the active StepEditor save.
- [x] 3.3 Scope or reset `frontend-food/src/store/useRecipeStepStore.ts` by recipe identity and prevent query hydration from replacing dirty local edits.
- [x] 3.4 Add frontend unit/component tests for dirty-state preservation, recipe switching, successful save clearing, and failed save retry.

## 4. Wizard Persistence and Ingredient Save Flow

- [x] 4.1 Update `frontend-food/src/components/recipe/RecipeWizard.tsx` and wizard step components so forward navigation flushes the active editor before changing steps.
- [x] 4.2 Ensure Step 3 saves preparation changes exactly once on `Weiter`, blocks navigation on failure, and preserves local edits for retry.
- [x] 4.3 Guard `InlineIngredientEditor` against concurrent/repeated saves and refresh the authoritative recipe state once after a successful save.
- [x] 4.4 Verify AI-generated recipe items and URL-imported recipe items remain editable and are not reintroduced from stale query data.
- [x] 4.5 Align visible method-specific actions and accessible labels with the actual wizard behavior, choosing either explicit `Generieren`/`Importieren` controls or the global `Weiter` contract.
- [x] 4.6 Update the standalone import page to use the canonical enhanced import hook and preview contract.

## 5. End-to-End Verification

- [x] 5.1 Add deterministic Playwright coverage for AI creation followed by manual ingredient and preparation edits plus reload verification.
- [x] 5.2 Add deterministic Playwright coverage for multiple ingredient additions, repeated save clicks, and exact-once ingredient persistence.
- [x] 5.3 Add deterministic Playwright coverage for URL preview/import using intercepted enhanced API responses, including steps and servings normalization.
- [x] 5.4 Update existing recipe workflow selectors and remove error filtering that hides failures from the flow under test.
- [x] 5.5 Run targeted backend tests with `uv run pytest`, Food frontend type checks and tests, and the relevant Playwright projects.
- [x] 5.6 Run `uv run python manage.py makemigrations --check` and review final Pydantic/Zod contract synchronization and migration requirements.

## 6. Follow-up Hardening

- [x] 6.1 Add external recipe-image download limits, redirect rejection, content-type validation, and SSRF regression tests.
- [ ] 6.2 Decide and implement Sentry integration for redacted import error telemetry.
