## 1. Backend: Database and Models

- [x] 1.1 Add JSONField `day_part_factors` on `MealPlan` with default value helper `default_day_part_factors`
- [x] 1.2 Add BooleanField `is_external` (default=False) and FloatField `external_energy_kj` (null=True, blank=True) on `Meal`
- [x] 1.3 Add custom save logic on `MealPlan` to propagate updated `day_part_factors` to unmodified associated meals
- [x] 1.4 Generate and run database migrations using `uv run python manage.py makemigrations` and `migrate`

## 2. Backend: Pydantic Schemas

- [x] 2.1 Update `MealPlanOut`, `MealPlanDetailOut`, `MealPlanCreateIn`, `MealPlanUpdateIn` to support `day_part_factors`
- [x] 2.2 Update `MealOut` and `MealUpdateIn` to support `is_external`, `external_energy_kcal`, and `day_part_factor`

## 3. Backend: API and Aggregation Logik

- [x] 3.1 Update `update_meal` endpoint to handle `day_part_factor`, `is_external`, and conversion of `external_energy_kcal` to `external_energy_kj`
- [x] 3.2 Update `_aggregate_meal_values` in `nutrition_aggregation.py` to handle external meals (only aggregate `external_energy_kj`, return 0 for everything else)
- [x] 3.3 Update `evaluate_meal_cockpit` to return neutral "green" evaluations for external meals where target matches actual
- [x] 3.4 Update `_evaluate_admin_rules` in `suggestion_service.py` to skip suggestion generation for external meals
- [x] 3.5 Write and execute backend unit tests for model save propagation, aggregation, and API serialization

## 4. Frontend: Zod Schemas

- [x] 4.1 Update `MealPlanSchema` and related in `frontend-food/src/schemas/mealPlan.ts` to sync with backend changes
- [x] 4.2 Update `MealSchema` and related in `frontend-food/src/schemas/mealPlan.ts` to sync with backend changes

## 5. Frontend: UI Components

- [x] 5.1 Implement factor fields in `SettingsPanel` to configure `day_part_factors`
- [x] 5.2 Add checkbox "Externe Mahlzeit" and input "Externe Kalorien (kcal)" in `MealSlot` / `MealItemEditor`
- [x] 5.3 Validate the whole frontend compiles, and run tests/linter
