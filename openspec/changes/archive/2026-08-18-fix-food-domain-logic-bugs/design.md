## Context

The Inspi platform contains an interconnected food calculation engine spanning ingredients (`supply`), recipes (`recipe`), meal plans (`planner`), and shopping lists (`shopping`). A technical domain audit revealed that mathematical discrepancies and missing query filters led to corrupted outputs in Nutri-Score calculation, shopping list generation, cooking schedule timelines, and recipe cockpit evaluations.

## Goals / Non-Goals

**Goals:**
- Fix the Nutri-Score calculation algorithm to adhere to official energy tables by converting kcal to kJ and deriving sodium from salt when sodium is missing.
- Isolate `RefMeal` template meals (`is_reference=True`) across shopping lists, nutrition summaries, and plan cockpits.
- Ensure direct ingredients (`MealItem.ingredient`) are fully supported in cooking schedule generation, cooking schedule PDF export, and scaled in meal plan PDF export.
- Standardize recipe ingredient and nutrition scaling across multi-portion recipes (`recipe.portions > 1`) for cockpit rules and nutrition aggregation.
- Generate meal plan shopping list PDFs via `generate_shopping_list(meal_plan)` instead of fragile regex parsing.
- Fix REWE export package quantity calculation to prevent runaway orders from small kitchen portion sizes.
- Clean invalid recipe types from suggestions service.

**Non-Goals:**
- Database schema migrations (all required columns and relationships already exist).
- Rewriting the shopping list real-time WebSocket protocol.
- Redesigning the Breakfast Wizard UI or recipe editor layout.

## Decisions

### Decision 1: Energy Conversion in Nutri-Score (`supply/services/nutri_service.py`)
- **Decision:** Convert `ingredient.energy_kcal` to kilojoules with `energy_kj = float(ingredient.energy_kcal) * 4.184` before comparing with `SOLID_ENERGY_THRESHOLDS` and `BEVERAGE_ENERGY_THRESHOLDS`.
- **Sodium Fallback:** If `ingredient.sodium_mg` is `None` but `ingredient.salt_g` is present, derive `sodium_mg = float(ingredient.salt_g) * 400.0`.
- **Alternative Considered:** Changing threshold tables to kcal. *Rejected* because Nutri-Score thresholds are defined internationally in kJ with non-integer kcal equivalents.

### Decision 2: RefMeal Isolation Across All Calculators
- **Decision:** Add `.filter(is_reference=False)` or `.filter(meal__is_reference=False)`:
  1. `supply/services/shopping_service.py` (`generate_shopping_list`)
  2. `planner/api/meal_plan.py` (`nutrition_summary`)
  3. `recipe/services/nutrition_aggregation.py` (`_aggregate_meal_plan_values`)
- **Rationale:** `RefMeal` instances are reusable plan-internal templates and must never be counted as food eaten or purchased.

### Decision 3: Direct Ingredient Support in Cooking Schedules
- **Decision:** In `planner/services/cooking_schedule_service.py`, parse and include direct `MealItem.ingredient` items in `build_cooking_schedule`.
  - Group direct ingredients into a synthetic direct-items block or include them directly under the meal's ingredient and timeline structure.
  - Scale quantities with `item.quantity * item.factor * effective_portions`.
  - Include their energy and cost in the schedule's day totals.
  - In `cooking_schedule_pdf.py` and `planner/services/pdf_export.py`, include and scale direct ingredients properly.

### Decision 4: Multi-Portion Normalization in Recipe Cockpits
- **Decision:** In `recipe/services/recipe_checks.py` (`evaluate_recipe_rules`, `match_recipe_hints`) and `recipe/services/nutrition_aggregation.py` (`_aggregate_meal_values`), divide recipe ingredient weights and per-serving values by `max(recipe.portions, 1)`.
- **Rationale:** All health and cockpit rules evaluate single-portion targets. If a recipe is created for 4 servings, the ingredient amounts represent 4 servings and must be divided by 4 for single-serving rule evaluation.

### Decision 5: Domain Shopping List Generation in PDF Export
- **Decision:** In `planner/services/pdf_export.py`, replace `_parse_and_accumulate_ingredient` and manual regex splitting with `supply.services.shopping_service.generate_shopping_list(meal_plan)`.
- **Rationale:** Reuses verified retail section grouping, price calculation, unit formatting, and portion option resolution.

### Decision 6: REWE Order Quantity Calculation Safeguards
- **Decision:** In `shopping/api.py` (`_compute_order_quantity`):
  - Check if `get_shopping_portion` returns a `Package` (or a `Portion` specifically marked as shopping-relevant with weight $> 20\text{g}$).
  - If only small cooking portions (e.g. 1 TL = 5g) exist, do NOT use them as package units. Fall back to raw grams (`"g"`) or format as kg.

## Affected Files

### Backend
- `backend/supply/services/nutri_service.py`
- `backend/supply/services/shopping_service.py`
- `backend/recipe/services/recipe_checks.py`
- `backend/recipe/services/nutrition_aggregation.py`
- `backend/planner/services/cooking_schedule_service.py`
- `backend/planner/services/cooking_schedule_pdf.py`
- `backend/planner/services/pdf_export.py`
- `backend/planner/services/intelligent_suggestions_service.py`
- `backend/planner/api/meal_plan.py`
- `backend/shopping/api.py`

### Tests
- `backend/supply/tests/test_nutri_service.py`
- `backend/planner/tests/test_calculation_consistency.py`
- `backend/planner/tests/test_cooking_schedule.py`
- `backend/planner/tests/test_cooking_schedule_pdf.py`
- `backend/planner/tests/test_pdf_export.py`
- `backend/shopping/tests/test_rewe_export.py`

## Risks / Trade-offs

- **[Existing Recalculated Nutri-Scores]** → Ingredients will receive more accurate (and often stricter) Nutri-Scores. Existing test fixtures asserting old inaccurate Nutri-Scores will be updated to match the correct mathematical formulas.
- **[Direct Ingredient Display in Schedule]** → Meals consisting purely of direct items (e.g. continental breakfast) will now show clear ingredient lists and timeline cards instead of empty cards.
