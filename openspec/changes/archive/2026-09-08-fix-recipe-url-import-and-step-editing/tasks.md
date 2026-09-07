## 1. Backend URL-Import Resilience

- [x] 1.1 In `backend/recipe/services/url_import_service.py`, check if alias name already exists across ingredients before creating `IngredientAlias`.
- [x] 1.2 In `url_import_service.py`, wrap alias creation in defensive error handling so existing or conflicting aliases are skipped without failing the import.
- [x] 1.3 Add backend test in `backend/recipe/tests/test_url_import_errors.py` (or `test_import_service.py`) verifying that URL import succeeds when an ingredient alias already exists.

## 2. Frontend Step Editor Input Synchronization

- [x] 2.1 Update `frontend-food/src/components/recipe/StepInstructionEditor.tsx` to propagate text changes immediately or flush pending changes before save.
- [x] 2.2 Ensure `StepEditor.tsx` marks `hasChanges` when typing begins and saves current field values even if focused during save.
- [x] 2.3 Verify `WizardStepSteps.tsx` and `RecipeWizard.tsx` persist updated step instructions when clicking „Weiter“ from Step 3.
- [x] 2.4 Add component tests in `frontend-food/src/components/recipe/StepEditor.test.tsx` for immediate step persistence on advance without explicit blur.

## 3. Verification

- [x] 3.1 Run backend tests with `uv run pytest backend/recipe/tests/`.
- [x] 3.2 Run frontend tests with `npm test -- src/components/recipe/StepEditor.test.tsx` in `frontend-food`.
- [x] 3.3 Verify recipe creation wizard workflow and URL import manually or via e2e.
