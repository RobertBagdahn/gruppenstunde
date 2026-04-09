## 1. Backend: Price-Model entfernen & Ingredient vereinfachen

- [x] 1.1 Remove `Price` model from `backend/supply/models/ingredient.py`
- [x] 1.2 Remove Price-related imports and references from `backend/supply/models/__init__.py`
- [x] 1.3 Simplify `backend/supply/services/price_service.py` — remove `run_price_cascade`, keep only `get_portion_price(ingredient, weight_g)` using `price_per_kg`
- [x] 1.4 Remove `PriceSchema` from `backend/supply/schemas/`
- [x] 1.5 Remove Price API endpoints from `backend/supply/api/`
- [x] 1.6 Create migration to drop Price table
- [x] 1.7 Update `backend/supply/services/shopping_service.py` — use `Ingredient.price_per_kg` directly instead of Price lookups

## 2. Backend: MealPlan → MealEvent Rename

- [x] 2.1 Rename `MealPlan` class to `MealEvent` in `backend/planner/models/meal_plan.py`, set `db_table = "planner_mealplan"` initially for safe migration
- [x] 2.2 Update FK field on `Meal` from `meal_plan` to `meal_event`
- [x] 2.3 Update all references in `backend/planner/api/` — rename endpoints from `/meal-plans/` to `/meal-events/`
- [x] 2.4 Rename Pydantic schemas: `MealPlanSchema` → `MealEventSchema`, `MealPlanCreateSchema` → `MealEventCreateSchema`, etc. in `backend/planner/schemas/`
- [x] 2.5 Update `backend/planner/services/` references from MealPlan to MealEvent
- [x] 2.6 Update `backend/event/` references that link to MealPlan
- [x] 2.7 Create migration for MealPlan → MealEvent rename

## 3. Backend: Meal datetime refactor

- [x] 3.1 Replace `date`, `time_start`, `time_end` fields on `Meal` with `start_datetime` (DateTimeField) and `end_datetime` (DateTimeField) in `backend/planner/models/meal_plan.py`
- [x] 3.2 Add `db_index=True` on `start_datetime` for efficient day queries
- [x] 3.3 Add uniqueness validation in `Meal.clean()` for `(meal_event, start_datetime__date, meal_type)`
- [x] 3.4 Create data migration: convert existing `date + time_start` → `start_datetime`, `date + time_end` → `end_datetime`
- [x] 3.5 Update `create_default_meals_for_date()` to use datetime instead of date+time
- [x] 3.6 Update Meal Pydantic schemas to use `start_datetime`/`end_datetime`
- [x] 3.7 Update day-query logic in API views — use `start_datetime__date` for grouping
- [x] 3.8 Update `DELETE /days/?date=` endpoint to filter by `start_datetime__date`

## 4. Backend: Recipe cached nutritional fields

- [x] 4.1 Add cache fields to `Recipe` model: `cached_energy_kj`, `cached_protein_g`, `cached_fat_g`, `cached_carbohydrate_g`, `cached_sugar_g`, `cached_fibre_g`, `cached_salt_g` (FloatField, nullable), `cached_nutri_class` (IntegerField 1-5, nullable), `cached_price_total` (DecimalField, nullable), `cached_at` (DateTimeField, nullable)
- [x] 4.2 Create migration for new cache fields
- [x] 4.3 Create `backend/recipe/signals.py` — invalidate cache on RecipeItem save/delete (set `cached_at = None`)
- [x] 4.4 Create signal handler for Ingredient save — invalidate all related Recipe caches
- [x] 4.5 Add cache recalculation logic in `backend/recipe/services/recipe_checks.py` — `recalculate_recipe_cache(recipe)`
- [x] 4.6 Call `recalculate_recipe_cache` synchronously after RecipeItem changes
- [x] 4.7 Add management command `recalculate_recipe_caches` for bulk recalculation
- [x] 4.8 Update Recipe Pydantic response schemas to include cache fields
- [x] 4.9 Update recipe list API to return cache fields (no extra joins needed)

## 5. Backend: HealthRule model & cockpit API

- [x] 5.1 Create `HealthRule` model in `backend/recipe/models/` with fields: name, description, parameter, scope, threshold_green, threshold_yellow, unit, tip_text, is_active, sort_order
- [x] 5.2 Create migration for HealthRule
- [x] 5.3 Create Pydantic schemas: `HealthRuleSchema`, `CockpitEvaluationSchema` (rule_id, rule_name, parameter, current_value, status, tip_text)
- [x] 5.4 Create `backend/recipe/services/cockpit_service.py` — evaluate rules for MealEvent, day, and meal scopes
- [x] 5.5 Add API endpoint `GET /api/health-rules/` — list active rules (public, no auth)
- [x] 5.6 Add API endpoint `GET /api/meal-events/{id}/cockpit/` — MealEvent-level evaluations
- [x] 5.7 Add API endpoint `GET /api/meal-events/{id}/cockpit/day/?date=YYYY-MM-DD` — day-level evaluations
- [x] 5.8 Add API endpoint `GET /api/meals/{id}/cockpit/` — meal-level evaluations
- [x] 5.9 Seed initial HealthRule entries (sugar, energy, price, nutri-class thresholds)

## 6. Backend: Normportion DGE reference data & extended API

- [x] 6.1 Create `backend/supply/data/dge_reference.py` with static DGE reference values (age group × gender → energy, protein, fat, carbohydrate, fibre)
- [x] 6.2 Update `backend/supply/services/norm_person_service.py` to integrate DGE data
- [x] 6.3 Extend `GET /api/norm-person/calculate` response to include DGE reference values for the given age/gender
- [x] 6.4 Extend `GET /api/norm-person/curves` response to include `dge_reference` array
- [x] 6.5 Add new endpoint `GET /api/norm-person/dge-reference/` returning all DGE values
- [x] 6.6 Update Pydantic schemas for extended norm-person responses

## 7. Backend: Tests & migrations

- [x] 7.1 Run all existing migrations: `uv run python manage.py makemigrations` and `uv run python manage.py migrate`
- [x] 7.2 Update `backend/planner/test_factories.py` for MealEvent/Meal changes
- [x] 7.3 Update `backend/recipe/test_factories.py` for cache fields
- [x] 7.4 Add tests for cockpit_service.py — evaluate health rules at each scope
- [x] 7.5 Add tests for recipe cache invalidation signals
- [x] 7.6 Add tests for simplified price_service.py
- [x] 7.7 Run full test suite: `uv run pytest`

## 8. Frontend: Schema sync (Zod)

- [x] 8.1 Remove `Price` schema from `frontend/src/schemas/supply.ts`
- [x] 8.2 Rename `mealPlan.ts` → `mealEvent.ts`, update all schema names: MealPlanSchema → MealEventSchema, etc.
- [x] 8.3 Update `Meal` Zod schema: replace `date`, `timeStart`, `timeEnd` with `startDatetime`, `endDatetime`
- [x] 8.4 Add cache fields to Recipe Zod schema: `cachedEnergyKj`, `cachedProteinG`, `cachedFatG`, `cachedCarbohydrateG`, `cachedSugarG`, `cachedFibreG`, `cachedSaltG`, `cachedNutriClass`, `cachedPriceTotal`, `cachedAt`
- [x] 8.5 Create `HealthRule` and `CockpitEvaluation` Zod schemas
- [x] 8.6 Update norm-person schemas with DGE reference fields
- [x] 8.7 Update all imports across frontend files referencing renamed schemas

## 9. Frontend: API hooks

- [x] 9.1 Rename `frontend/src/api/mealPlans.ts` → `mealEvents.ts`, update all endpoint paths from `/meal-plans/` to `/meal-events/`
- [x] 9.2 Remove Price-related API calls from `frontend/src/api/supplies.ts`
- [x] 9.3 Add cockpit API hooks: `useHealthRules()`, `useMealEventCockpit(id)`, `useDayCockpit(id, date)`, `useMealCockpit(id)`
- [x] 9.4 Update recipe API hooks to use cache fields in list responses
- [x] 9.5 Add DGE reference API hook: `useDgeReference(pal?)`
- [x] 9.6 Update all imports across frontend files referencing renamed hooks

## 10. Frontend: Pages & components refactor

- [x] 10.1 Rename `MealPlanListPage.tsx` → `MealEventListPage.tsx`, update component and route
- [x] 10.2 Rename `MealPlanDetailPage.tsx` → `MealEventDetailPage.tsx`, update to use `startDatetime`/`endDatetime`
- [x] 10.3 Add Cockpit tab to MealEvent detail page alongside "Tagesplan", "Naehrwerte", "Einkaufsliste"
- [x] 10.4 Update `MealPlanLandingPage.tsx` → `MealEventLandingPage.tsx`
- [x] 10.5 Update React Router routes for `/planning/meal-events/` path
- [x] 10.6 Update recipe list/cards to show `cachedNutriClass` badge and `cachedPriceTotal`

## 11. Frontend: Cockpit & Ampel components

- [x] 11.1 Create `TrafficLightIndicator` component — colored dot (green/yellow/red) with label
- [x] 11.2 Create `HealthTipCard` component — displays tip_text for yellow/red rules
- [x] 11.3 Create `CockpitDashboard` component — grid of TrafficLightIndicators with summary status
- [x] 11.4 Create `CockpitSummaryCard` component — overall status (worst across all rules), counts of green/yellow/red
- [x] 11.5 Integrate cockpit indicators into day cards in MealEvent detail
- [x] 11.6 Integrate cockpit indicators into meal cards in MealEvent detail
- [x] 11.7 Add mobile-responsive compact mode for traffic lights (dots only, tap for detail)

## 12. Frontend: Normportion graphs extension

- [x] 12.1 Add DGE reference overlay to energy chart on NormPortionSimulatorPage
- [x] 12.2 Add macronutrient breakdown chart (stacked bar per age group, male/female)
- [x] 12.3 Add optional MealEvent context: `?meal-event-id=123` parameter for Ist vs. Soll comparison
- [x] 12.4 Show Ist vs. Soll graphs when MealEvent context is provided
- [x] 12.5 Ensure mobile responsiveness for all new graphs (320px minimum)

## 13. Cleanup & documentation

- [x] 13.1 Remove all references to old `Price` model across codebase (backend + frontend)
- [x] 13.2 Update `backend/AGENTS.md` with new model names and relationships
- [x] 13.3 Update `frontend/AGENTS.md` with renamed schemas and new components
- [x] 13.4 Update OpenSpec specs: `openspec/specs/meal-plan/spec.md`, `openspec/specs/recipe/spec.md`, `openspec/specs/ingredient-database/spec.md`, `openspec/specs/supply-base/spec.md`, `openspec/specs/norm-portion-simulator/spec.md`
- [x] 13.5 Final full test run: `uv run pytest` (backend) and verify frontend compiles: `npm run build` (frontend)
