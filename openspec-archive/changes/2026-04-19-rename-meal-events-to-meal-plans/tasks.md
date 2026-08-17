## 1. Backend: Model Rename

- [x] 1.1 Rename `MealEvent` class to `MealPlan` in `backend/planner/models/meal_plan.py` (keep `db_table = 'planner_mealplan'`)
- [x] 1.2 Update `Meal.meal_event` FK field name to `meal_plan` (add `db_column='meal_event_id'` to avoid DB migration)
- [x] 1.3 Update all imports and references in `backend/planner/` (api, schemas, services)
- [x] 1.4 Update FK reference in `backend/event/models/core.py` (`Event.meal_plan` FK target)
- [x] 1.5 Update references in `backend/shopping/` (source_type value, API endpoint paths)
- [x] 1.6 Update references in `backend/recipe/` (cockpit API references to MealEvent)
- [x] 1.7 Rename API file `backend/planner/meal_plan_api.py` references and router variable name

## 2. Backend: API Route Rename

- [x] 2.1 Change route mount in `backend/inspi/urls.py` from `/meal-events/` to `/meal-plans/`
- [x] 2.2 Update `backend/shopping/api.py` endpoint path `from-meal-event` to `from-meal-plan`

## 3. Backend: Schema Rename

- [x] 3.1 Rename all `MealEvent*` Pydantic schemas to `MealPlan*` in `backend/planner/schemas/`
- [x] 3.2 Update schema references in API endpoints
- [x] 3.3 Update `__init__.py` re-exports in `backend/planner/schemas/`

## 4. Frontend: Schema Rename

- [x] 4.1 Rename `frontend/src/schemas/mealEvent.ts` to `mealPlan.ts`
- [x] 4.2 Rename all `MealEvent*` Zod schemas to `MealPlan*`
- [x] 4.3 Update all imports across frontend that reference `mealEvent` schemas

## 5. Frontend: API Hooks Rename

- [x] 5.1 Rename `frontend/src/api/mealEvents.ts` to `mealPlans.ts`
- [x] 5.2 Rename all `useMealEvent*` hooks to `useMealPlan*`
- [x] 5.3 Update all API endpoint URLs from `/api/meal-events/` to `/api/meal-plans/`
- [x] 5.4 Update all imports across frontend that reference `mealEvents` hooks

## 6. Frontend: Pages and Routes Rename

- [x] 6.1 Rename `MealEventLandingPage` to `MealPlanLandingPage` (file and component)
- [x] 6.2 Rename `MealEventListPage` to `MealPlanListPage` (file and component)
- [x] 6.3 Rename `MealEventDetailPage` to `MealPlanDetailPage` (file and component)
- [x] 6.4 Update routes in `frontend/src/App.tsx`: `/meal-events/*` -> `/meal-plans/*`
- [x] 6.5 Add redirect routes from `/meal-events/*` to `/meal-plans/*`
- [x] 6.6 Update all internal links/navigations referencing `/meal-events/`

## 7. Frontend: Navigation and UI Updates

- [x] 7.1 Update navigation menu items referencing "meal-events" paths
- [x] 7.2 Update any breadcrumb or sidebar references

## 8. Verification

- [x] 8.1 Global search for remaining `meal.event`, `meal_event`, `MealEvent`, `mealEvent` references (excluding DB column names and migration files)
- [x] 8.2 Update OpenSpec `components.md` and `config.yaml` references
- [x] 8.3 Verify backend starts without errors (`uv run python manage.py check`)
- [x] 8.4 Verify frontend builds without errors (`npm run build`)
