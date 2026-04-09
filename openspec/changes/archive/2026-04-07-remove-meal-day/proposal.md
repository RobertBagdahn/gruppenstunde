## Why

The `MealDay` model is an unnecessary intermediate layer between `MealPlan` and `Meal`. It only holds a `date` field and a reference to `MealPlan`, adding complexity to queries, schemas, and API endpoints without providing meaningful value. Moving `date` and `meal_plan` directly onto `Meal` simplifies the data model, reduces nesting in API responses, and makes the frontend code more straightforward.

## What Changes

- **BREAKING** Remove the `MealDay` model entirely from `planner.models`
- **BREAKING** Add `meal_plan` (FK to `MealPlan`) and `date` (DateField) directly to the `Meal` model, replacing the `meal_day` FK
- **BREAKING** Update all API endpoints: remove `/days/` CRUD, change meal endpoints to operate directly under meal plans
- **BREAKING** Update Pydantic schemas: remove `MealDayOut`, `MealDayCreateIn`; restructure `MealPlanDetailOut` to nest meals directly
- **BREAKING** Update Zod schemas: remove `MealDaySchema`; restructure `MealPlanDetailSchema`
- Update `MealDay.create_default_meals()` logic — move default meal creation to `MealPlan` level
- Update admin registrations: remove `MealDayAdmin` and `MealDayInline`
- Update seed data command to create meals without MealDay intermediary
- Update shopping service docstrings referencing MealDay chain
- Create and run data migration to flatten existing MealDay → Meal relationships
- Delete the `MealDay` database table after data migration

## Capabilities

### New Capabilities

_(none — this is a simplification refactor, no new capabilities introduced)_

### Modified Capabilities

- `meal-plan`: The meal plan data model changes from `MealPlan → MealDay → Meal` to `MealPlan → Meal`. API endpoints, response schemas, and day-grouping logic change accordingly. The `unique_together` constraint moves from `(meal_plan, date)` on MealDay to `(meal_plan, date, meal_type)` on Meal.

## Impact

- **Django Apps**: `planner` (models, schemas, API, admin, tests, migrations)
- **Management Commands**: `seed_all` (meal plan seeding logic)
- **Services**: `supply.services.shopping_service` (docstring references)
- **Pydantic Schemas**: `MealDayOut`, `MealDayCreateIn` removed; `MealOut` gains `date` and `meal_plan` fields; `MealPlanDetailOut` restructured
- **Zod Schemas**: `MealDaySchema` removed; `MealSchema` gains `date` field; `MealPlanDetailSchema` restructured
- **Frontend Pages**: `MealPlanDetailPage` — day-grouping moves from API structure to frontend grouping logic
- **API Endpoints**: `add_day`, `remove_day` removed; `add_meal` URL changes; meal plan detail response shape changes
- **Database Migration**: Data migration required to copy `meal_day.date` and `meal_day.meal_plan` to each `Meal`, then drop `MealDay` table
