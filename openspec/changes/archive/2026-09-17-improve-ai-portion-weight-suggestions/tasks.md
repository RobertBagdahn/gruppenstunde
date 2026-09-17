## 1. Backend AI Suggestion Quality

- [x] 1.1 Extend `backend/supply/services/portion_magic_wand.py` prompts and structured validation to require at least one positive-weight practical suggestion for ordinary incomplete ingredients and a Stück suggestion for piece-based foods.
- [x] 1.2 Add the Hotdog-Brötchen rule and regression fixture so a normal `Stück` proposal receives a plausible positive estimate around 55 g without hard-coding the UI result.
- [x] 1.3 Implement one bounded repair request for responses that contain no positive-weight practical suggestion, preserving the original context and returning an explicit manual-review state when repair remains unresolved.
- [x] 1.4 Validate quantities, measuring units, positive weights and package total-weight consistency before returning preview operations; never fabricate a fallback weight.
- [x] 1.5 Preserve fresh preview tokens, weighted-portion protection, apply atomicity, stale-preview conflicts and existing AI/manual weight provenance.

## 2. Backend Contracts And Tests

- [x] 2.1 Update `backend/supply/schemas/portion_magic_wand.py` with any required confidence, rationale, provenance and manual-review fields, keeping preview/apply request and response contracts synchronized.
- [x] 2.2 Add backend unit tests for positive piece estimates, Hotdog-Brötchen, package consistency, first-response repair, unresolved fallback, invalid weights and unauthenticated access.
- [x] 2.3 Add API integration tests proving preview does not mutate data, apply requires positive confirmed weights, and selected estimates persist atomically with expected source metadata.
- [x] 2.4 Run `uv run python manage.py makemigrations --check` and confirm no migration is needed unless persisted provenance is introduced.

## 3. Food Frontend Contract And Dialog

- [x] 3.1 Synchronize `frontend-food/src/schemas/supply.ts` and related API hooks with the backend magic-wand contract without TypeScript `any` types.
- [x] 3.2 Update the Ingredient detail magic-wand dialog to show positive estimated grams, confidence and rationale for new and replacement operations.
- [x] 3.3 Keep manual weight entry, explicit delete-without-replacement, disabled apply state, loading, error, empty and retry feedback for unresolved suggestions in German.
- [x] 3.4 Keep weighted existing portions read-only and unselected, and ensure new suggestions remain individually selectable before confirmation.
- [x] 3.5 Add drag-and-drop ordering for selectable preview operations, map the confirmed order to ranks with the first active operation as the standard portion, and keep weighted existing portions fixed.
- [x] 3.6 Add a "Weitere Portionen mit KI erzeugen" action that requests a fresh preview, merges non-duplicate operations locally, and keeps apply separate.

## 4. Frontend And Browser Tests

- [x] 4.1 Add Vitest contract/component coverage for positive estimates, rationale/confidence display, manual fallback and confirmation blocking.
- [x] 4.2 Add a deterministic Playwright flow for `Hotdog-Brötchen` that verifies a visible positive Stück estimate and proves no apply request is sent before confirmation.
- [x] 4.3 Add Playwright coverage for an additional package suggestion, selection independence and unresolved manual-weight fallback at the 320px viewport.
- [x] 4.4 Add Vitest and Playwright coverage for drag ordering, standard-rank assignment, protected weighted rows and requesting additional AI suggestions.

## 5. Verification And Release

- [x] 5.1 Run targeted backend supply and API tests for the magic-wand and portion-integrity flows.
- [x] 5.2 Run Food frontend typecheck/build, lint, targeted Vitest tests and the complete Food frontend test suite.
- [x] 5.3 Run desktop and 320px Playwright tests, including the Hotdog-Brötchen acceptance case.
- [x] 5.4 Run `uv run pytest` and review any unrelated baseline failures separately.
- [x] 5.5 Validate the completed change with `openspec validate "improve-ai-portion-weight-suggestions" --type change --strict` and document deployment/rollback behavior.
