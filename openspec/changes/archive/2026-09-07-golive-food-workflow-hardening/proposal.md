## Why

Before Peter goes live with his new meal plan tomorrow, creating recipes, managing cooking steps, and executing audits and checks must run reliably without data corruption, stale client state, or false verification errors.

Detailed code inspection of the live workflow identified several critical failure points:
1. **Recipe verification error:** `verification_service.py` evaluates 100g cached nutritional values directly against per-portion rule thresholds (e.g. 500–800 kcal), causing false-positive warnings and blocking valid recipes from verification.
2. **Stale verification cache in UI:** `invalidateRecipeData()` does not invalidate `recipe-verification-status`, leaving the "Verifizieren" dialog showing old missing-field warnings even after the user adds images or ingredients.
3. **Stale meal plan views:** Mutating meals, days, or meal items invalidates only `['meal-plan', id]`, leaving shopping lists, costs, nutrition summary, suggestions, and cooking schedules stale across tab switches.
4. **Tag mapping mismatch in wizard:** `TagMultiSelect` outputs slugs while `RecipeWizard` sends them as `tag_ids`, leading to dropped tags or backend validation errors.
5. **Plan dates and timezone shifting:** Slicing ISO dates directly in `SettingsPanel` causes 1–2 hour shifts in Europe/Berlin, while `null` values can trigger unhandled 500 errors.
6. **Destructive deletions without confirmation:** Meal items and meals can be accidentally deleted with a single tap, and non-edge days present a delete button that fails with a 400 error.
7. **Kitchen cooking mode fragility:** Lack of screen wake-lock causes screens to turn off during cooking, and checkbox progress resets on reload.

## What Changes

- **Fix Verification Logic:** Align `verification_service.py` with `recipe_checks.py` by applying the serving portion factor (`serving_weight / 100`) to nutritional evaluation.
- **Unified Cache Invalidation:**
  - Add `['recipe-verification-status', recipeId]` to `invalidateRecipeData()`.
  - Create a central helper `invalidateMealPlanData(queryClient, planId)` covering `meal-plan`, `meal-plan-shopping`, `meal-plan-costs`, `meal-plan-nutrition`, `meal-plan-suggestions`, and `cooking-schedule`.
- **Dual-Sided Tag Robustness:**
  - Update `WizardStepMetadata` to pass `valueKey="id"` to `TagMultiSelect`.
  - Update backend recipe endpoints to resolve any incoming slugs in `tag_ids` to `Tag` UUID instances.
- **Timezone & Date Hardening:**
  - Parse and format dates in `SettingsPanel` with localized Europe/Berlin times.
  - Guard `start_datetime` and `end_datetime` against `None` before checking `is_naive` in `backend/planner/api/meal_plan.py`.
  - Validate `end_datetime >= start_datetime` in both frontend and backend.
- **Safety Confirmations & Edge Day Logic:**
  - Add confirmation dialogs for deleting meals and meal items in `MealSlot.tsx`.
  - Only show "Tag löschen" on first and last days of the plan with a tooltip explaining contiguity constraints.
- **Cooking Mode Robustness:**
  - Integrate `navigator.wakeLock` into `RecipeCookingMode.tsx` to keep the screen on.
  - Persist checked step progress in `sessionStorage`.

## Capabilities

### New Capabilities
- `meal-plan-cache-invalidation`: Centralized invalidation across all meal plan tabs on any CRUD mutation.
- `recipe-wizard-tag-mapping`: Consistent dual-sided resolution of tag IDs and slugs in recipe creation and editing.

### Modified Capabilities
- `recipe-verification`: Accurate per-serving evaluation of nutritional rules in readiness checks and reactive UI updates.
- `meal-plan`: Timezone-aware date handling, safe day deletion constraints, and deletion confirmation dialogs.

## Impact

- **Backend:**
  - `backend/recipe/services/verification_service.py`
  - `backend/recipe/api/recipes.py`
  - `backend/planner/api/meal_plan.py`
- **Frontend-Food:**
  - `frontend-food/src/api/recipes.ts`
  - `frontend-food/src/api/mealPlans.ts`
  - `frontend-food/src/components/recipe/RecipeWizard.tsx`
  - `frontend-food/src/components/recipe/WizardStepMetadata.tsx`
  - `frontend-food/src/pages/planning/SettingsPanel.tsx`
  - `frontend-food/src/pages/planning/MealSlot.tsx`
  - `frontend-food/src/pages/planning/MealEventDetailPage.tsx`
  - `frontend-food/src/pages/recipes/RecipeCookingMode.tsx`
