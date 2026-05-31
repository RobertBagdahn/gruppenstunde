## REMOVED Requirements

### Requirement: Backward-compatibility re-export modules
Re-Export-Dateien (`schemas/ingredient.ts`, `api/ingredients.ts`, `schemas/mealEvent.ts`, `pages/planning/MealPlan*.tsx`) SHALL be removed. Consumer modules SHALL import directly from source modules.

#### Scenario: All imports resolve after removal
- **WHEN** re-export files are deleted and consumers updated
- **THEN** TypeScript build (`npm run build`) SHALL complete without errors

### Requirement: Unused API hooks
Unused hooks (`useMaterials`, `useMaterial`, `useMaterialBySlug`, `useSupplySearch`, `useCreateMaterial`, `useUpdateMaterial`, `useMeasuringUnits`, `usePortions`, `useRecipeFolders`, `useCreateRecipeFolder`, `useDeleteRecipeFolder`, `useDgeReferences`) SHALL be removed from their respective API files.

#### Scenario: No runtime references to removed hooks
- **WHEN** hooks are removed
- **THEN** TypeScript build SHALL complete without errors and no grep matches for removed hook names exist

### Requirement: Dead backend service removal
`backend/supply/services/ingredient_ai_service.py` SHALL be deleted entirely.

#### Scenario: Backend starts without errors
- **WHEN** the file is deleted
- **THEN** `uv run python manage.py check` SHALL pass without errors

### Requirement: Stale HealthRule reference fix
The reference to `HealthRule` in `core/management/commands/seed_all.py` SHALL be removed or updated to reference the current `Rule` model.

#### Scenario: Seed command runs without error
- **WHEN** `uv run python manage.py seed_all` is executed
- **THEN** no ImportError or AttributeError related to HealthRule SHALL occur
