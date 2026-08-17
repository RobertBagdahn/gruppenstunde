## Context

The current meal plan data model uses a three-level hierarchy: `MealPlan -> MealDay -> Meal -> MealItem`. The `MealDay` model only holds a `date` field and a FK to `MealPlan`. Every query, schema, and API endpoint must traverse this intermediate layer, adding complexity without value. The `date` field logically belongs on `Meal` directly.

Current state:
- `MealDay` model at `backend/planner/models/meal_plan.py:87`
- `Meal.meal_day` FK at `backend/planner/models/meal_plan.py:119`
- API endpoints for day CRUD at `backend/planner/api/meal_plan.py:150-174`
- Pydantic schemas `MealDayOut`, `MealDayCreateIn` at `backend/planner/schemas/meal_plan.py:52-59`
- Zod schema `MealDaySchema` at `frontend/src/schemas/mealPlan.ts:39-44`
- Frontend page `MealPlanDetailPage.tsx` uses nested `plan.days[].meals[]` structure

## Goals / Non-Goals

**Goals:**
- Flatten the data model: `Meal` gets `meal_plan` FK and `date` field directly
- Simplify API: remove day-level CRUD, adjust meal endpoints
- Reduce schema nesting: `MealPlanDetailOut.meals` instead of `MealPlanDetailOut.days[].meals[]`
- Maintain all existing functionality (adding/removing meals, nutrition summary, shopping list)
- Data migration to preserve existing meal data

**Non-Goals:**
- Changing the MealItem model or recipe integration
- Changing the nutrition summary or shopping list calculation logic (beyond updating FK traversals)
- Adding new features to the meal plan system
- Changing the MealPlan model itself (name, slug, portions, factors, event binding)

## Decisions

### 1. Move `date` and `meal_plan` to Meal model

**Decision**: Add `meal_plan` FK and `date` DateField to `Meal`, remove `meal_day` FK.

**Rationale**: This is the most direct flattening approach. `date` is the only meaningful data on `MealDay`, and it naturally belongs on `Meal` since each meal occurs on a specific date. The `unique_together` constraint becomes `(meal_plan, date, meal_type)` on `Meal`.

**Alternative considered**: Keep MealDay as a lightweight grouping and just simplify the API — rejected because it doesn't reduce model complexity and the grouping can be done in the frontend/API response.

### 2. API response groups meals by date

**Decision**: The `MealPlanDetailOut` response changes from `days: list[MealDayOut]` to `meals: list[MealOut]`, where `MealOut` now includes a `date` field. The frontend handles grouping by date for display.

**Rationale**: Keeping the API flat and letting the frontend group by date is simpler and more flexible. The backend doesn't need a day-grouping abstraction.

### 3. Replace day CRUD with date-based meal operations

**Decision**: Remove `POST /{id}/days/` and `DELETE /{id}/days/{day_id}/`. The `add_meal` endpoint changes from `POST /{id}/days/{day_id}/meals/` to `POST /{id}/meals/` with `date` in the request body. To "add a day", the user adds meals for a new date. To "remove a day", delete all meals for that date (or add a bulk delete endpoint).

**Rationale**: Without MealDay, day management is implicit — a "day" exists when meals exist for that date.

**Alternative considered**: Keep explicit day endpoints that auto-create default meals — rejected because this couples the API to a specific workflow. The frontend can call `add_meal` three times to create default meals for a date.

### 4. Add a bulk "add day with defaults" convenience endpoint

**Decision**: Add `POST /{id}/days/` that takes a `date` and creates default meals (breakfast, lunch, dinner) for that date. This preserves the current UX where adding a day auto-creates meal slots.

**Rationale**: While the individual `add_meal` endpoint is sufficient, creating 3 meals per day is the primary use case. A convenience endpoint reduces round-trips.

### 5. Data migration strategy

**Decision**: Two-step migration:
1. Schema migration: add `meal_plan` and `date` fields to `Meal` (nullable initially), then data migration to copy from `MealDay`, then make fields non-nullable and drop `MealDay`.
2. Single migration file with `RunPython` for data copying.

**Rationale**: Keeps it in one deployment. No backward compatibility needed (per project conventions).

## Affected Files

### Backend
| File | Change |
|------|--------|
| `backend/planner/models/meal_plan.py` | Remove `MealDay`, add `meal_plan`+`date` to `Meal`, move `create_default_meals` to `MealPlan` |
| `backend/planner/models/__init__.py` | Remove `MealDay` export |
| `backend/planner/schemas/meal_plan.py` | Remove `MealDayOut`, `MealDayCreateIn`; add `date` to `MealOut`; change `MealPlanDetailOut.days` to `meals` |
| `backend/planner/schemas/__init__.py` | Remove `MealDay*` exports |
| `backend/planner/api/meal_plan.py` | Rewrite day/meal endpoints, update FK traversals |
| `backend/planner/admin.py` | Remove `MealDayAdmin`, `MealDayInline`; add `MealInline` on MealPlanAdmin |
| `backend/planner/tests/__init__.py` | Update `make_meal_day` factory, update test references |
| `backend/core/management/commands/seed_all.py` | Update meal plan seeding |
| `backend/supply/services/shopping_service.py` | Update FK traversal in queries/docstrings |

### Frontend
| File | Change |
|------|--------|
| `frontend/src/schemas/mealPlan.ts` | Remove `MealDaySchema`; add `date` to `MealSchema`; change `MealPlanDetailSchema.days` to `meals` |
| `frontend/src/api/mealPlans.ts` | Remove `useAddDay`/`useRemoveDay`; update `useAddMeal` |
| `frontend/src/pages/planning/MealPlanDetailPage.tsx` | Group meals by date in frontend instead of using `plan.days` |

### API Endpoint Changes

| Before | After |
|--------|-------|
| `POST /{id}/days/` → creates MealDay + default meals | `POST /{id}/days/` → creates default meals for a date (convenience) |
| `DELETE /{id}/days/{day_id}/` → deletes MealDay | `DELETE /{id}/days/` with `?date=YYYY-MM-DD` → deletes all meals for date |
| `POST /{id}/days/{day_id}/meals/` → adds Meal to day | `POST /{id}/meals/` with `date` in body → adds Meal to plan |
| `DELETE /{id}/meals/{meal_id}/` → unchanged | `DELETE /{id}/meals/{meal_id}/` → unchanged (but FK traversal updates) |
| `meal__meal_day__meal_plan` traversals | `meal__meal_plan` traversals |

### Database Migration

1. Add `meal_plan_id` (FK, nullable) and `date` (nullable) to `planner_meal`
2. `RunPython`: copy `meal_day.meal_plan_id` and `meal_day.date` to each `Meal`
3. Make `meal_plan_id` and `date` non-nullable
4. Remove `meal_day_id` FK from `planner_meal`
5. Drop `planner_mealday` table
6. Add `unique_together = ["meal_plan", "date", "meal_type"]` on `Meal`

## Risks / Trade-offs

- **[Data migration on production]** → Mitigation: single atomic migration, no backward compatibility needed. Test migration on staging data first.
- **[Frontend breaking change]** → Mitigation: API response shape changes from `days[].meals[]` to `meals[]` with `date`. Frontend must be deployed simultaneously with backend. Acceptable since both deploy together.
- **[Loss of day-level operations]** → Mitigation: convenience endpoint for "add day with defaults" preserves the main UX pattern. Bulk delete by date covers "remove day".
- **[unique_together change]** → Adding `(meal_plan, date, meal_type)` means you can't have two breakfasts on the same day. This matches current behavior (enforced at MealDay level).
