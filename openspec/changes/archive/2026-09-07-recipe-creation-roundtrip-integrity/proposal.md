## Why

Recipe creation currently loses user edits or produces inconsistent data across the AI, manual, and URL-import flows. Preparation edits can remain only in client state when advancing the wizard, ingredient saves can be processed more than once, and the legacy Chefkoch import path does not reliably extract complete recipes. These failures undermine the core recipe workflow and require an end-to-end integrity contract before further recipe features are added.

## What Changes

- Make every wizard step persist its current recipe data before the user advances.
- Ensure preparation-step edits are not overwritten by stale query data or an unrelated store instance.
- Make ingredient saves idempotent for one user action, including additions, updates, and deletions.
- Preserve AI-generated ingredients and preparation steps while allowing subsequent manual edits.
- Consolidate or clearly align the classic and enhanced URL-import flows so Chefkoch recipes return complete, usable previews.
- Fix URL-import parsing for JSON-LD, microdata, and Chefkoch fallback data, including servings, ingredients, steps, images, and durations.
- Add Playwright coverage for AI creation, manual edits, ingredient round-trips, preparation round-trips, and URL import failure/success states.
- Update backend Pydantic and frontend Zod contracts wherever import or recipe-step payloads change.

## Capabilities

### New Capabilities

- `recipe-creation-roundtrip-integrity`: Reliable persistence and reload integrity across recipe creation methods and wizard steps.

### Modified Capabilities

- `recipe-creation-wizard`: Require wizard navigation to preserve edits made in the active step.
- `recipe-url-import`: Require complete, normalized recipe previews for supported external recipe pages.

## Impact

- Food frontend: `RecipeWizard`, method/ingredient/metadata/steps wizard components, `StepEditor`, recipe-step Zustand state, recipe and import API hooks, and related Zod schemas.
- Backend recipe API and services: recipe CRUD, recipe-step batch updates, URL import services, Chefkoch parsing, import schemas, and recipe creation tests.
- End-to-end tests: `e2e/tests/recipe-workflows.spec.ts` and new focused Playwright scenarios using deterministic fixtures or mocked external responses.
- API contracts: recipe import response/request schemas and recipe-step batch payloads must remain synchronized between Pydantic and Zod.
- No backwards-compatibility layer is required; existing broken import behavior may be replaced by the corrected unified flow.
