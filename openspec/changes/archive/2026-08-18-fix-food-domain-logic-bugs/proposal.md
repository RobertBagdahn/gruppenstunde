## Why

A deep domain audit of the food ecosystem (ingredients, recipes, meal planning, cooking schedule, and shopping lists) uncovered critical calculation bugs, scaling contradictions, and missing implementations:
1. Nutri-Score calculation compares kilocalories directly against kilojoule threshold tables and lacks a sodium fallback from salt.
2. Template meals (`RefMeal` with `is_reference=True`) leak into transient shopping lists, nutrition summaries, and plan cockpit aggregations as phantom real meals.
3. Direct meal ingredients (`MealItem.ingredient` from the breakfast wizard, direct snacks, or drinks) are omitted from cooking schedules and PDFs, and unscaled in meal plan PDF exports.
4. Recipe Cockpit and hint evaluations do not divide multi-portion recipe ingredients/totals by `recipe.portions`, miscalculating 4-portion recipes as 4x calories and costs.
5. The PDF export of the shopping list uses fragile regex string splitting instead of the domain service, losing supermarket retail sections and corrupting quantities for mixed units.
6. REWE export falls back to arbitrary small cooking portions (e.g., 5g teaspoons) for package order counts when packages are not explicitly configured.
7. Suggestions service references non-existent recipe types (`soup`, `salad`, `side`).

Fixing these domain logic errors ensures data integrity, realistic calculations, and dependable outputs across the entire food pipeline.

## What Changes

- **Nutri-Score Calculation (`nutri_service.py`)**:
  - Convert `energy_kcal` to kilojoules ($kJ = \text{kcal} \times 4.184$) before comparing against Nutri-Score energy threshold tables for solid foods and beverages.
  - Automatically calculate sodium from salt ($1\text{g salt} \approx 400\text{mg sodium}$) when `sodium_mg` is not explicitly set.
- **RefMeal Isolation (`shopping_service.py`, `meal_plan.py`, `nutrition_aggregation.py`)**:
  - Explicitly filter `is_reference=False` (or `meal__is_reference=False`) in `generate_shopping_list`, `nutrition_summary`, and `_aggregate_meal_plan_values`.
- **Cooking Schedule & PDF Direct Ingredients (`cooking_schedule_service.py`, `cooking_schedule_pdf.py`, `pdf_export.py`)**:
  - Update `build_cooking_schedule` to process both `MealItem.recipe` and `MealItem.ingredient` items so direct breakfast/snack items appear in the cooking schedule and contribute to schedule nutrition and cost totals.
  - Include direct ingredients in `cooking_schedule_pdf.py`.
  - Properly scale direct ingredient quantities in `pdf_export.py` with `portions * reserve_factor * item.factor`.
- **Recipe Portion Normalization in Cockpit & Hints (`recipe_checks.py`, `nutrition_aggregation.py`)**:
  - Scale recipe items and totals by `1 / max(recipe.portions, 1)` in `evaluate_recipe_rules`, `match_recipe_hints`, and `_aggregate_meal_values` so multi-portion recipes evaluate correctly against single-serving thresholds.
- **PDF Export Shopping List (`pdf_export.py`)**:
  - Replace regex string parsing with `generate_shopping_list(meal_plan)` output, preserving supermarket retail section grouping and correct unit aggregation.
- **REWE Export Order Quantity Calculation (`shopping/api.py`)**:
  - Fix `_compute_order_quantity` to avoid using small sub-portion units (like teaspoons/pinches) as package multipliers, falling back cleanly to raw grams or kg units when no valid package exists.
- **Recipe Types in Suggestions (`intelligent_suggestions_service.py`)**:
  - Clean `MEAL_TYPE_TO_RECIPE_TYPES` to align strictly with valid `RecipeTypeChoices`.

## Capabilities

### New Capabilities
- `food-logic-integrity`: Comprehensive specification for correct calculation rules across Nutri-Score, RefMeal template isolation, direct ingredient scheduling, recipe portion normalization, and shopping list PDF/REWE generation.

### Modified Capabilities
- `meal-plan`: Explicitly specifies that `is_reference=True` templates are excluded from shopping lists, nutrition summaries, and plan cockpits, and that direct ingredients are included in cooking schedules.
- `recipe-rules-display`: Explicitly specifies that multi-portion recipes are scaled per serving before rule evaluation.

## Impact

- **Backend Services & APIs**:
  - `supply/services/nutri_service.py`
  - `supply/services/shopping_service.py`
  - `recipe/services/recipe_checks.py`
  - `recipe/services/nutrition_aggregation.py`
  - `planner/services/cooking_schedule_service.py`
  - `planner/services/cooking_schedule_pdf.py`
  - `planner/services/pdf_export.py`
  - `planner/services/intelligent_suggestions_service.py`
  - `planner/api/meal_plan.py`
  - `shopping/api.py`
- **Schemas**: Pydantic and Zod schemas remain compatible; existing endpoints return mathematically correct and complete data.
- **Database / Migrations**: No database schema migrations required (existing model fields are utilized properly).
