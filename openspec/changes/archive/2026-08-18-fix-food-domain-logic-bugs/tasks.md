## 1. Nutri-Score Calculation

- [x] 1.1 Convert `energy_kcal` to kilojoules ($kJ = \text{energy\_kcal} \times 4.184$) in `backend/supply/services/nutri_service.py` for both solid foods and beverages before table lookup
- [x] 1.2 Implement automatic sodium derivation from `salt_g` ($1\text{g salt} \approx 400\text{mg sodium}$) when `sodium_mg` is `None` in `nutri_service.py`
- [x] 1.3 Update Nutri-Score tests in `backend/supply/tests/test_nutri_service.py` to verify correct mathematical scoring against kJ thresholds

## 2. RefMeal Template Isolation

- [x] 2.1 Filter out `is_reference=True` meals (`meal__is_reference=False`) in `backend/supply/services/shopping_service.py` (`generate_shopping_list`)
- [x] 2.2 Filter out `is_reference=True` meals in `backend/planner/api/meal_plan.py` (`nutrition_summary` endpoint)
- [x] 2.3 Filter out `is_reference=True` meals in `backend/recipe/services/nutrition_aggregation.py` (`_aggregate_meal_plan_values`)
- [x] 2.4 Add regression tests verifying that adding a RefMeal template to a plan does not increase shopping list quantities or plan nutrition summary

## 3. Multi-Portion Recipe Normalization

- [x] 3.1 Normalize per-serving nutrient values, `weight_g`, and `price_total` by dividing by `max(recipe.portions, 1)` in `backend/recipe/services/recipe_checks.py` (`evaluate_recipe_rules`, `match_recipe_hints`)
- [x] 3.2 Normalize recipe item nutrient contributions by dividing by `max(recipe.portions, 1)` in `backend/recipe/services/nutrition_aggregation.py` (`_aggregate_meal_values`)
- [x] 3.3 Add unit tests verifying that 4-portion recipes evaluate correctly against single-serving rules without 4x inflation

## 4. Direct Ingredients in Cooking Schedule & PDF

- [x] 4.1 Update `backend/planner/services/cooking_schedule_service.py` (`build_cooking_schedule`) to include direct `MealItem.ingredient` items in schedule timelines, ingredient lists, nutrition totals, and cost totals
- [x] 4.2 Update `backend/planner/services/cooking_schedule_pdf.py` to display direct `MealItem.ingredient` items in the PDF output
- [x] 4.3 Update `backend/planner/services/pdf_export.py` (`_build_item_data` / `_build_sub_meal`) to scale direct ingredient quantities with `portions * reserve_factor * item.factor`
- [x] 4.4 Add tests in `backend/planner/tests/test_cooking_schedule.py` and `test_cooking_schedule_pdf.py` verifying direct ingredients appear and are correctly scaled

## 5. Shopping List PDF Export Domain Generation

- [x] 5.1 Refactor `backend/planner/services/pdf_export.py` (`_aggregate_shopping_list`) to use `supply.services.shopping_service.generate_shopping_list(meal_plan)`
- [x] 5.2 Ensure retail sections and clean unit formatting are preserved in the PDF context
- [x] 5.3 Update and verify PDF export tests in `backend/planner/tests/test_pdf_export.py`

## 6. REWE Export & Suggestions Cleanup

- [x] 6.1 Update `backend/shopping/api.py` (`_compute_order_quantity`) to avoid small cooking sub-portions ($< 20\text{g}$) as package multipliers when calculating order quantities
- [x] 6.2 Remove non-existent recipe types (`soup`, `salad`, `side`) from `MEAL_TYPE_TO_RECIPE_TYPES` in `backend/planner/services/intelligent_suggestions_service.py`
- [x] 6.3 Update REWE export tests in `backend/shopping/tests/test_rewe_export.py`

## 7. Verification

- [x] 7.1 Run Django migration check: `uv run python manage.py makemigrations --check`
- [x] 7.2 Run backend test suite: `uv run pytest`
