# Implementation Tasks

## 1. Backend: Recipe Verification & Tag Resolution
- [x] 1.1 In `backend/recipe/services/verification_service.py`, apply serving weight scaling factor (`serving_weight / 100`) to nutritional values before `rule.evaluate()`.
- [x] 1.2 Write unit tests in `backend/recipe/tests/test_verification_scaling.py` verifying that per-portion rules evaluate accurately against recipes.
- [x] 1.3 In `backend/recipe/api/recipes.py`, add slug resolution to `tag_ids` in `create_recipe` and `update_recipe` so both UUIDs and slugs are accepted.
- [x] 1.4 Write unit test in `backend/recipe/tests/test_api.py` verifying recipes save successfully with tag slugs or UUIDs.

## 2. Backend: Meal Plan Date & Timezone Guards
- [x] 2.1 In `backend/planner/api/meal_plan.py`, guard `timezone.is_naive` against `None` for `start_datetime` and `end_datetime`.
- [x] 2.2 Add validation that `end_datetime >= start_datetime` returning HTTP 400 with a localized error message.
- [x] 2.3 Write tests in `backend/planner/tests/test_meal_plan_dates.py` for null dates and invalid date ranges.

## 3. Frontend-Food: Centralized Cache Invalidation
- [x] 3.1 In `frontend-food/src/api/mealPlans.ts`, implement `invalidateMealPlanData(queryClient, planId)` covering all plan tabs.
- [x] 3.2 Update `useAddMealItem`, `useRemoveMealItem`, `useUpdateMealItem`, `useAddMeal`, `useRemoveMeal`, `useAddDayBefore`, `useAddDayAfter`, `useRemoveDay`, and `useSaveDirectMeal` to call `invalidateMealPlanData`.
- [x] 3.3 In `frontend-food/src/api/recipes.ts`, add `['recipe-verification-status', recipeId]` to `invalidateRecipeData()`.
- [x] 3.4 In `frontend-food/src/hooks/useRecipeSteps.ts`, invalidate exact recipe detail and verification query keys on step batch updates.

## 4. Frontend-Food: Wizard Tag Handling & Date UI
- [x] 4.1 In `frontend-food/src/components/recipe/WizardStepMetadata.tsx`, pass `valueKey="id"` to `TagMultiSelect` and ensure `selectedTagSlugs` holds IDs consistently.
- [x] 4.2 In `frontend-food/src/pages/planning/SettingsPanel.tsx`, prevent timezone shifts when parsing and formatting date inputs.
- [x] 4.3 In `frontend-food/src/pages/planning/SettingsPanel.tsx`, disable saving and display an error when end date is before start date.

## 5. Frontend-Food: Accidental Delete Protection & Day Deletion Logic
- [x] 5.1 In `frontend-food/src/pages/planning/MealSlot.tsx`, add confirmation dialogs before deleting meal items and meals.
- [x] 5.2 In `frontend-food/src/pages/planning/MealEventDetailPage.tsx`, disable "Tag löschen" for interior days and explain edge-day constraint via tooltip.

## 6. Frontend-Food: Kitchen Cooking Mode
- [x] 6.1 In `frontend-food/src/pages/recipes/RecipeCookingMode.tsx`, add Screen Wake Lock API integration to prevent display sleep.
- [x] 6.2 In `frontend-food/src/pages/recipes/RecipeCookingMode.tsx`, persist checked ingredient state in `sessionStorage`.

## 7. Verification & E2E Validation
- [x] 7.1 Run full backend test suite (`uv run pytest`).
- [x] 7.2 Run full frontend build and vitest suite (`npm run build && npm run test`).
- [x] 7.3 Run Playwright smoke tests for recipe and meal plan creation workflows.
