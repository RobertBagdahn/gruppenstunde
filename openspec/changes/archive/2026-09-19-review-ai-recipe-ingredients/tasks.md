## 1. Backend review contracts and preview services

- [x] 1.1 Define Pydantic schemas for import sources, source provenance, match candidates, review rows, temporary ingredient drafts, portions, statuses, explanations, and field-level errors in `backend/recipe/schemas/`.
- [x] 1.2 Add side-effect-free preview paths to ingredient matching, AI ingredient enrichment, portion assignment, and recipe AI suggestion services; ensure preview never creates Ingredient or Portion rows.
- [x] 1.3 Extend matcher responses with human-readable reasons, technical details, candidates, confidence, method, and replacement context required by the review contract.
- [x] 1.4 Add multi-source URL/text extraction orchestration and conflict detection to the recipe import services, preserving source references for every extracted row.
- [x] 1.5 Add authenticated preview endpoints for URL/text import and existing-recipe AI ingredient, quantity, portion, and replacement suggestions.

## 2. Backend finalization and persistence

- [x] 2.1 Add a finalization request schema that accepts only explicitly confirmed, valid review rows and temporary ingredient/portion payloads.
- [x] 2.2 Implement atomic recipe finalization in a recipe service using `transaction.atomic()`, revalidating permissions, existing IDs, required fields, and portion integrity before creating temporary records and recipe items.
- [x] 2.3 Update recipe creation and existing-recipe AI update endpoints to reject unresolved rows and apply only confirmed review data.
- [x] 2.4 Return structured field-path errors for validation and persistence failures so the frontend can mark the affected ingredient or portion editor.
- [x] 2.5 Add backend tests for preview side effects, authentication/permissions, multi-source provenance, conflicts, unresolved rows, atomic rollback, and successful finalization.
- [x] 2.6 Run `uv run python manage.py makemigrations --check` and confirm no migration is required; add a migration only if implementation discovers a necessary persisted contract.

## 3. Frontend schemas, API hooks, and local state

- [x] 3.1 Add Zod schemas matching all new and changed Pydantic review, source, candidate, temporary ingredient, finalization, and field-error contracts.
- [x] 3.2 Add TanStack Query mutations for multi-source preview, retry with additional sources, existing-recipe AI previews, and atomic finalization.
- [x] 3.3 Create a typed local review store with original source rows, selected values, draft ingredient/portion data, explicit statuses, dirty tracking, bulk confirmation, reset, and error paths.
- [x] 3.4 Add navigation/reload protection that warns on dirty review state and discards the local aggregate after confirmed navigation away.

## 4. Recipe wizard review experience

- [x] 4.1 Add the conditional `Zutaten prüfen` step before `Zutaten` in `frontend-food/src/components/recipe/RecipeWizard.tsx`, including step navigation guards.
- [x] 4.2 Implement compact review rows in source order showing original text, selected ingredient, portion, quantity, source, status, and expandable explanation/technical details.
- [x] 4.3 Implement candidate selection, free ingredient search, `Zutat ändern`, add-extra-ingredient, reject-and-resolve behavior, conflict display, and explicit per-row confirmation.
- [x] 4.4 Implement `Alle Vorschläge übernehmen` for all complete rows and block progression while any row is unresolved or invalid.
- [x] 4.5 Add multi-source input controls for URLs and pasted website/recipe text, including retry after failed extraction and source attribution on rows.
- [x] 4.6 Preserve AI and current values side by side after manual changes and regenerate portion/quantity suggestions when the selected ingredient changes.

## 5. Existing editor integration and save handling

- [x] 5.1 Adapt the existing ingredient editor to support a draft callback mode that updates local review data without invoking persistence mutations.
- [x] 5.2 Adapt the existing portion editor to support temporary add/edit/delete/default selection using the same views and validation as normal ingredient editing.
- [x] 5.3 Add final recipe save integration that submits only confirmed review data and keeps the complete local state after failures.
- [x] 5.4 Render German global and field-level errors for validation, permission, network, and transaction failures, with retry actions where applicable.
- [x] 5.5 Ensure canceling or leaving the flow discards all temporary ingredients, portions, mappings, and recipe data.

## 6. Frontend verification and regression coverage

- [x] 6.1 Add component tests for exact-match confirmation, candidate replacement, new ingredient draft review, portion editing, conflicts, source display, bulk confirmation, and unresolved-row blocking.
- [x] 6.2 Add tests that assert no ingredient/portion mutation is called before final recipe save and that failed saves preserve the local review state.
- [x] 6.3 Add wizard regression tests for manual recipes without the review step, URL imports with the review step, existing-recipe AI suggestions, and browser navigation warnings.
- [x] 6.4 Run the relevant frontend test suite, typecheck, backend tests, and schema validation; resolve any Pydantic/Zod drift.
