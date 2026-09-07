## 1. Backend Data Model

- [x] 1.1 Add a boolean manual norm portions override field to `backend/planner/models/meal_plan.py` with a default that preserves automatic behavior.
- [x] 1.2 Create a new Django migration; do not modify existing migrations.
- [x] 1.3 Update MealPlan Pydantic output and update schemas with the override field and validation rules.

## 2. Backend Behavior

- [x] 2.1 Update `update_meal_plan` to validate event linkage, whole positive manual values, and automatic-mode reset behavior.
- [x] 2.2 Update `MealPlan.recalculate_norm_portions()` to no-op while manual mode is active.
- [x] 2.3 Update group-member create, bulk-create, update, delete, and event synchronization endpoints to preserve manual values.
- [x] 2.4 Add backend tests for enabling, rejecting, disabling, and preserving manual norm portions.

## 3. Food Frontend API and Schemas

- [x] 3.1 Fix `frontend-food/src/api/mealPlans.ts` so `patchJson()` parses the response body only once.
- [x] 3.2 Add the override field and request types to `frontend-food/src/schemas/mealPlan.ts` and `frontend-food/src/api/mealPlans.ts`.
- [x] 3.3 Add a regression test for successful MealPlan PATCH parsing and structured errors.

## 4. Food Frontend UI

- [x] 4.1 Update `SettingsPanel` to show the manual/automatic switch only for event-linked plans.
- [x] 4.2 Restrict manual values to positive whole numbers and preserve the selected mode during save.
- [x] 4.3 Add German labels and feedback for switching back to automatic calculation.
- [x] 4.4 Add or update component tests for event-linked and standalone settings.

## 5. Verification

- [x] 5.1 Run targeted backend planner tests with `uv run pytest`.
- [x] 5.2 Run Food-Frontend type checks and relevant tests.
- [x] 5.3 Run `uv run python manage.py makemigrations --check`.
- [x] 5.4 Review API Pydantic/Zod synchronization and the final diff.
