## 1. Backend Contract And Unit Resolution

- [x] 1.1 Add deterministic canonical MeasuringUnit alias resolution for AI output, covering common German names and abbreviations without falling back unknown units to Gramm.
- [x] 1.2 Refactor `backend/supply/services/portion_magic_wand.py` to normalize suggestions, preserve distinct partial valid results, enforce positive physical weights, separate package operations from portions, and perform at most one repair request only when no complete suggestion is available.
- [x] 1.3 Extend the backend Portion Magic Wand Pydantic schemas with any actionable validation/unit metadata required by the preview UI while preserving preview-token and atomic apply semantics.
- [x] 1.4 Add backend tests for unit aliases, unknown units, duplicate suggestions, fewer-than-four valid suggestions, empty repair responses, piece/package weights, stale previews, and weighted-source protection.
- [x] 1.5 Harden atomic apply against missing/foreign source IDs and duplicate package operations with HTTP 422 responses and rollback tests.

## 2. Data Integrity And Migration

- [x] 2.1 Audit existing MeasuringUnit and Portion data for stückartige names stored with incorrect unit semantics and document the migration criteria.
- [x] 2.2 Create a new Django data migration that safely corrects only unambiguous reference/portion records, preserves recipe foreign keys and positive weights, and does not silently assign one-gram defaults.
- [x] 2.3 Update seed/master data and shared portion knowledge so generated unit names are canonical and consistent with the active MeasuringUnit set.
- [x] 2.4 Add migration and integrity tests covering existing weighted portions, unresolved piece portions, recipe references, and absence of phantom units.

## 3. Food Frontend Contract And Dialog

- [x] 3.1 Synchronize `frontend-food/src/schemas/supply.ts` with the backend preview/apply schemas and add contract fixtures for complete, unchanged, manual-weight, and invalid-unit operations.
- [x] 3.2 Update the ingredient portions dialog in `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx` to show canonical units, separate portion/package groups, actionable validation reasons, partial-result messaging, and safe selection defaults.
- [x] 3.3 Keep apply disabled only for selected invalid operations, provide manual positive-weight entry for unresolved suggestions, and display German error/success feedback for preview and apply failures.
- [x] 3.4 Add Food frontend unit/component tests for rendering piece/package suggestions, preserving weighted rows, handling partial results, manual weight validation, and preventing invalid apply.
- [x] 3.5 Add contract tests for the unified `Portionen`/`Packungen` dialog and backend/frontend `package` operation synchronization.

## 4. End-To-End Verification

- [x] 4.1 Add or update an end-to-end scenario that opens the portion wand for a representative ingredient, verifies useful generated suggestions, selects a valid subset, and confirms persisted weights and semantics after reload.
- [x] 4.2 Run relevant backend Supply tests, Food frontend tests, contract tests, and the portion-related Playwright tests; fix regressions without weakening weighted-portion protection.
- [x] 4.3 Run `uv run python manage.py makemigrations --check` and the project-required test commands, then review the final diff for backend/frontend schema synchronization and migration safety.

## 5. Structured Food And Recipe Gemini Output

- [x] 5.1 Add centralized empty/schema-invalid response validation and one correction retry for structured Gemini calls.
- [x] 5.2 Replace permissive `list[dict]` recipe-step extraction models with typed nested Pydantic models and domain minimums.
- [x] 5.3 Add retry/audit metadata for structured attempts while keeping one user operation and final status.
- [x] 5.4 Audit remaining Food-/recipe-specific JSON parsers and migrate them from manual JSON extraction to response schemas.
- [x] 5.5 Add parametrized structured-output tests covering empty JSON, malformed JSON, schema mismatch, domain-empty results and successful retry.

## 6. Release Integrity

- [x] 6.1 Add a release/contract check that backend structured enum changes and Food frontend Zod changes are built from the same commit.
- [x] 6.2 Document and verify the shared Backend/Food-Frontend deployment order, including required Django migrations.
