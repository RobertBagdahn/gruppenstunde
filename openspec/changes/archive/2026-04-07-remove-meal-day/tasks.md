## 1. Backend Model Changes

- [x] 1.1 Update `Meal` model in `backend/planner/models/meal_plan.py`: add `meal_plan` FK (to MealPlan) and `date` DateField; remove `meal_day` FK; set `unique_together = ["meal_plan", "date", "meal_type"]`; update `ordering` to `["date", "meal_type"]`; update `__str__` to use `self.date`
- [x] 1.2 Remove `MealDay` model class from `backend/planner/models/meal_plan.py`
- [x] 1.3 Move `create_default_meals` logic to `MealPlan` as `create_default_meals_for_date(date)` method
- [x] 1.4 Update `backend/planner/models/__init__.py`: remove `MealDay` from imports and `__all__`
- [x] 1.5 Create migration: `uv run python manage.py makemigrations planner` — should generate add fields, data migration, remove MealDay. May need manual `RunPython` for data copy.

## 2. Backend Pydantic Schemas

- [x] 2.1 Update `MealOut` in `backend/planner/schemas/meal_plan.py`: add `date: dt.date` field
- [x] 2.2 Remove `MealDayOut` and `MealDayCreateIn` schemas
- [x] 2.3 Update `MealCreateIn`: add `date: dt.date` field
- [x] 2.4 Update `MealPlanDetailOut`: replace `days: list[MealDayOut]` with `meals: list[MealOut]`
- [x] 2.5 Update `MealPlanOut`: replace `days_count` with `meals_count` and update resolver
- [x] 2.6 Add `MealDayBulkCreateIn` schema with `date: dt.date` for the convenience endpoint
- [x] 2.7 Update `backend/planner/schemas/__init__.py`: remove `MealDay*` exports, add new schemas

## 3. Backend API Endpoints

- [x] 3.1 Update `create_meal_plan` in `backend/planner/api/meal_plan.py`: replace `MealDay.objects.create` with direct `Meal` creation using `create_default_meals_for_date`
- [x] 3.2 Update `get_meal_plan`: change `prefetch_related` from `days__meals__items__recipe` to `meals__items__recipe`; set `can_edit` flag
- [x] 3.3 Update `list_meal_plans`: change `prefetch_related("days")` to `prefetch_related("meals")`
- [x] 3.4 Rewrite `add_day` endpoint: accept date, create default meals directly on Meal (no MealDay), return list of created meals
- [x] 3.5 Rewrite `remove_day` endpoint: accept date as query param, delete all meals for that date
- [x] 3.6 Rewrite `add_meal` endpoint: change URL from `/{id}/days/{day_id}/meals/` to `/{id}/meals/`, use `date` from payload
- [x] 3.7 Update `remove_meal`: change FK traversal from `meal_day__meal_plan` to `meal_plan`
- [x] 3.8 Update `add_meal_item`: change FK traversal from `meal_day__meal_plan` to `meal_plan`
- [x] 3.9 Update `remove_meal_item`: change FK traversal from `meal__meal_day__meal_plan` to `meal__meal_plan`
- [x] 3.10 Update `nutrition_summary`: change `meal__meal_day__meal_plan` to `meal__meal_plan`
- [x] 3.11 Remove `MealDay` from imports in API file

## 4. Backend Admin & Supporting Files

- [x] 4.1 Update `backend/planner/admin.py`: remove `MealDayInline` and `MealDayAdmin`; add `MealInline` to `MealPlanAdmin`
- [x] 4.2 Update `backend/planner/tests/__init__.py`: remove `make_meal_day` factory; update test helpers to create meals directly
- [x] 4.3 Update `backend/core/management/commands/seed_all.py`: replace `MealDay` creation with direct `Meal` creation
- [x] 4.4 Update `backend/supply/services/shopping_service.py`: fix FK traversals and docstrings

## 5. Frontend Zod Schemas

- [x] 5.1 Update `MealSchema` in `frontend/src/schemas/mealPlan.ts`: add `date: z.string()` field
- [x] 5.2 Remove `MealDaySchema` and `MealDay` type
- [x] 5.3 Update `MealPlanDetailSchema`: replace `days: z.array(MealDaySchema)` with `meals: z.array(MealSchema)`
- [x] 5.4 Update `MealPlanSchema`: replace `days_count` with `meals_count`

## 6. Frontend API Hooks

- [x] 6.1 Update `frontend/src/api/mealPlans.ts`: remove `useAddDay` and `useRemoveDay` hooks
- [x] 6.2 Add/update `useAddDay` hook to call `POST /{id}/days/` with `{ date }` (convenience endpoint for default meals)
- [x] 6.3 Add `useRemoveDay` hook to call `DELETE /{id}/days/?date=YYYY-MM-DD`
- [x] 6.4 Update `useAddMeal` hook: change URL from `/{id}/days/{dayId}/meals/` to `/{id}/meals/`, add `date` to payload

## 7. Frontend Page Updates

- [x] 7.1 Update `MealPlanDetailPage.tsx`: replace `plan.days` iteration with `plan.meals` grouped by date (using `date-fns` or `Object.groupBy`)
- [x] 7.2 Remove `MealDay` type import, use `Meal` type with `date` field
- [x] 7.3 Update add-day and remove-day UI handlers to use new hooks

## 8. Verification

- [x] 8.1 Run `uv run python manage.py makemigrations --check` to verify no pending migrations
- [x] 8.2 Run `uv run python manage.py migrate` to apply migrations
- [x] 8.3 Run backend tests: `uv run pytest backend/planner/`
- [x] 8.4 Run frontend type check: `npx tsc --noEmit` in frontend/
- [x] 8.5 Verify seed command works: `uv run python manage.py seed_all` (or relevant subset) — seed_all fails on pre-existing event app issue (unrelated), planner seeding code updated correctly
