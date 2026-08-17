## 1. Backend Model + Migration

- [x] 1.1 Add `start_datetime` and `end_datetime` fields to `MealPlan` model (nullable DateTimeField)
- [x] 1.2 Create migration with data migration: populate fields from existing Meals (min/max `start_datetime`)
- [x] 1.3 Run `uv run python manage.py makemigrations planner` and `uv run python manage.py migrate`

## 2. Backend Schemas

- [x] 2.1 Update `MealPlanCreateIn`: replace `start_date`/`num_days` with `start_datetime`/`end_datetime`
- [x] 2.2 Update `MealPlanUpdateIn`: add optional `start_datetime`/`end_datetime`
- [x] 2.3 Update `MealPlanOut` and `MealPlanDetailOut` (if separate): add `start_datetime`/`end_datetime`

## 3. Backend API — Create Logic

- [x] 3.1 Refactor `create_meal_plan` endpoint: derive days from `start_datetime`/`end_datetime` range
- [x] 3.2 Implement `meals_for_day()` helper: filter meal types by start/end time for first/last day
- [x] 3.3 Generate meals for each day using the new time-aware logic

## 4. Backend API — Add Day Before/After

- [x] 4.1 Create `POST /api/meal-plans/{id}/add-day-before/` endpoint
- [x] 4.2 Create `POST /api/meal-plans/{id}/add-day-after/` endpoint
- [x] 4.3 Each endpoint: shift start/end, generate meals for new day, backfill meals on previously first/last day

## 5. Frontend Schemas + API Hooks

- [x] 5.1 Update Zod `MealPlanSchema` / `MealPlanDetailSchema`: add `start_datetime`, `end_datetime`
- [x] 5.2 Update create mutation payload (replace `start_date`/`num_days`)
- [x] 5.3 Add `useAddDayBefore` and `useAddDayAfter` mutation hooks in `mealPlans.ts`

## 6. Frontend UI

- [x] 6.1 Settings-Panel: replace date picker with two `datetime-local` inputs for Start/Ende
- [x] 6.2 DayPlanView: remove date-picker "Tag hinzufügen" UI
- [x] 6.3 DayPlanView: add "Tag davor" button above first day, "Tag danach" button below last day
- [x] 6.4 Wire buttons to new mutation hooks
- [x] 6.5 Only show buttons when `start_datetime`/`end_datetime` are set on the plan

## 7. Frontend Create Page

- [x] 7.1 Update `CreateMealPlanPage`: replace start_date + num_days inputs with start/end datetime-local inputs
