## 1. Database Migration

- [x] 1.1 Create Django migration with raw SQL to rename and convert all 5 energy columns: `supply_ingredient.energy_kj` → `energy_kcal`, `supply_dgereference.energy_kj` → `energy_kcal`, `recipe_recipe.cached_energy_kj` → `cached_energy_kcal`, `recipe_recipe.cached_energy_total_kj` → `cached_energy_total_kcal`, `planner_meal.external_energy_kj` → `external_energy_kcal`
- [x] 1.2 Add `UPDATE <table> SET <new> = ROUND(<old> / 4.184)` for each column
- [x] 1.3 Add `UPDATE recipe_rule SET parameter = 'energy_kcal' WHERE parameter = 'energy_kj'`
- [x] 1.4 Use `SeparateDatabaseAndState` to keep Django ORM state in sync with raw SQL

## 2. Django Models

- [x] 2.1 Update `supply/models/ingredient.py`: Rename `energy_kj` to `energy_kcal`, update verbose_name to "Energie (kcal)"
- [x] 2.2 Update `supply/models/reference.py`: Rename `energy_kj` to `energy_kcal`, update verbose_name to "Energie (kcal)"
- [x] 2.3 Update `recipe/models/recipe.py`: Rename `cached_energy_kj` to `cached_energy_kcal`, `cached_energy_total_kj` to `cached_energy_total_kcal`
- [x] 2.4 Update `planner/models/meal_plan.py`: Rename `external_energy_kj` to `external_energy_kcal`
- [x] 2.5 Update `supply/choices.py`: Rename `ENERGY_KJ` to `ENERGY_KCAL`, update label to "Energie (kcal)"
- [x] 2.6 Update `recipe/models/rule.py`: Update help_text references from `energy_kj` to `energy_kcal` and `kJ` to `kcal`
- [x] 2.7 Run `uv run python manage.py makemigrations` to capture model state changes (the SQL migration should already exist)

## 3. Pydantic Schemas

- [x] 3.1 Update `supply/schemas/ingredients.py`: Rename `energy_kj` → `energy_kcal` in `IngredientOut`, `IngredientCreateIn`, `IngredientUpdateIn`, `AiIngredientSuggestion`
- [x] 3.2 Update `supply/schemas/reference.py`: Rename `energy_kj` → `energy_kcal`
- [x] 3.3 Update `supply/schemas/norm_person.py`: Rename `energy_kj` → `energy_kcal`
- [x] 3.4 Update `recipe/schemas/recipes.py`: Rename `cached_energy_kj` → `cached_energy_kcal`
- [x] 3.5 Update `recipe/schemas/nutrition.py`: Rename all `*_kj` fields to `*_kcal`, remove duplicate `energy_kcal` computed fields (now redundant)
- [x] 3.6 Update `planner/schemas/meal_plan.py`: Rename `energy_kj` → `energy_kcal` in `MealItemOut`, `MealOut`, `MealPlanNutritionDaySummary`, `NutritionPerPortion`; remove `resolve_energy_kj` → rename to `resolve_energy_kcal`; update `resolve_external_energy_kcal` to read directly from `external_energy_kcal` (no conversion)
- [x] 3.7 Update `supply/services/ingredient_ai_suggest_service.py`: Rename `energy_kj` → `energy_kcal` in AI request/response schemas

## 4. Backend Services — Remove Conversions

- [x] 4.1 Delete `recipe/services/nutrition_units.py` (remove `kj_to_kcal` and `kcal_to_kj`)
- [x] 4.2 Update `recipe/services/nutrition_aggregation.py`: Rename all `energy_kj` dict keys to `energy_kcal`; remove `kj_to_kcal` call in `_evaluate_rules`; remove `kcal_to_kj` call for external meal fallback (use `2335.0 * day_part_factor` directly)
- [x] 4.3 Update `recipe/services/recipe_checks.py`: Rename `energy_kj` cache field key to `energy_kcal`; remove `kj_to_kcal` calls at rule evaluation points; update `cached_energy_kcal` and `cached_energy_total_kcal` assignment
- [x] 4.4 Update `recipe/services/nutrition_aggregation.py` (rule evaluation): Remove `if rule.parameter == "energy_kj": current_value = kj_to_kcal(current_value)` — no conversion needed
- [x] 4.5 Update `recipe/services/improvement_ranking_service.py`: Rename `energy_kj` dict key to `energy_kcal`, update fallback threshold value to `80` (was `335.0 / 4.184`)
- [x] 4.6 Update `recipe/services/nutri_improvement_service.py`: Rename `energy_kj` parameter to `energy_kcal`; remove `kj_to_kcal` calls
- [x] 4.7 Update `recipe/services/health_traits_service.py`: Change formula from `protein_g * 17.0 / energy_kj` to `protein_g * 4.0 / energy_kcal`; update parameter name
- [x] 4.8 Update `recipe/services/suggestion_service.py`: Rename `energy_kj` to `energy_kcal` in label/unit maps; remove `kj_to_kcal` call
- [x] 4.9 Update `recipe/services/url_import_service.py`: Rename `energy_kj` to `energy_kcal` in AI import schema and mapping

## 5. Backend APIs

- [x] 5.1 Update `supply/api/ingredients.py`: Replace `energy_kj` references with `energy_kcal`
- [x] 5.2 Update `recipe/api/nutrition.py`: Rename all `energy_kj` dict keys to `energy_kcal`; remove all `kj_to_kcal` conversion calls; update response field names
- [x] 5.3 Update `planner/api/meal_plan.py`: Replace `external_energy_kcal` conversion logic (`kcal_to_kj`) with direct assignment; update `resolve_total_energy_kj` references to `resolve_total_energy_kcal`
- [x] 5.4 Update `supply/admin.py`: Replace `energy_kj` with `energy_kcal` in list_display and fieldsets

## 6. Seed Data & Management Commands

- [x] 6.1 Update `core/management/commands/seed_all.py`: Convert all `"energy_kj"` values from kJ to kcal (÷ 4.184, round to 0 decimals); rename key to `"energy_kcal"`
- [x] 6.2 Update `recipe/management/commands/seed_rules.py`: Rename all `"parameter": "energy_kj"` to `"parameter": "energy_kcal"`
- [x] 6.3 Update `core/management/commands/fix_ingredient_nutrition.py`: Convert all hardcoded `"energy_kj"` values to kcal; rename key
- [x] 6.4 Update `supply/management/commands/fix_ingredients.py`: Rename AI prompt schema `energy_kj` → `energy_kcal`; update queries
- [x] 6.5 Update `core/management/commands/import_legacy_food.py`: Rename `energy_kj` field references
- [x] 6.6 Update `supply/data/dge_reference.py`: Convert all `energy_kj` values to kcal (÷ 4.184, round to 0 decimals); rename key to `energy_kcal`

## 7. Frontend-Food Zod Schemas

- [x] 7.1 Update `frontend-food/src/schemas/supply.ts`: Rename `energy_kj` → `energy_kcal` in `IngredientOutNested`, `IngredientOut`, `AiIngredientSuggestion`
- [x] 7.2 Update `frontend-food/src/schemas/recipe.ts`: Rename `cached_energy_kj` → `cached_energy_kcal`; rename `energy_kj` → `energy_kcal` in `ItemNutrition`; rename `total_energy_kj` → `total_energy_kcal` in `NutritionBreakdown`; remove `energy_kcal` computed field (now redundant)
- [x] 7.3 Update `frontend-food/src/schemas/mealPlan.ts`: Rename `energy_kj` → `energy_kcal` in `MealItemOut`; rename `total_energy_kj` → `total_energy_kcal` in `MealOut`; rename `per_portion_energy_kj` → `per_portion_energy_kcal`; rename `energyKcal` parameter → rename `getCoverageStatus` signature; update `cached_energy_kj` → `cached_energy_kcal` in `RecipeOut`
- [x] 7.4 Update `frontend-food/src/schemas/normPerson.ts`: Rename `energy_kj` → `energy_kcal`

## 8. Frontend Zod Schemas

- [x] 8.1 Update `frontend/src/schemas/supply.ts`: Rename `energy_kj` → `energy_kcal`
- [x] 8.2 Update `frontend/src/schemas/normPerson.ts`: Rename `energy_kj` → `energy_kcal`

## 9. Frontend-Food Utils & Stores

- [x] 9.1 Delete `frontend-food/src/utils/nutritionUnits.ts` (remove `kjToKcal`)
- [x] 9.2 Update `frontend-food/src/utils/nutritionCalculator.ts`: Rename all `energy_kj` → `energy_kcal`, `total_energy_kj` → `total_energy_kcal`
- [x] 9.3 Update `frontend-food/src/store/useRecipeModificationStore.ts`: Rename `energy_kj` → `energy_kcal` in scaling logic

## 10. Frontend-Food UI Components — Remove kjToKcal Calls

- [x] 10.1 Update `frontend-food/src/pages/planning/MealSlot.tsx`: Remove `kjToKcal` import; replace `kjToKcal(meal.total_energy_kj / normPortions)` with `meal.total_energy_kcal / normPortions`; rename `external_energy_kcal` already correct
- [x] 10.2 Update `frontend-food/src/pages/planning/DayPlanView.tsx`: Remove `kjToKcal` import; update energy sum calculation
- [x] 10.3 Update `frontend-food/src/pages/planning/TableView.tsx`: Remove `kjToKcal` import; update energy accumulation and display
- [x] 10.4 Update `frontend-food/src/pages/planning/NutritionView.tsx`: Remove `kjToKcal` import; update parameter config and display values
- [x] 10.5 Update `frontend-food/src/pages/planning/CopyFromPlanDialog.tsx`: Remove `kjToKcal` import; update energy display
- [x] 10.6 Update `frontend-food/src/pages/planning/RefMealEditorPage.tsx`: Remove `kjToKcal` import; remove `ENERGY_KJ_TO_KCAL` constant
- [x] 10.7 Update `frontend-food/src/pages/planning/RecipePreviewDialog.tsx`: Remove `kjToKcal` import; update energy per serving calculation
- [x] 10.8 Update `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`: Remove `kjToKcal` import; rename `totalEnergyKj` → `totalEnergyKcal`; update all energy display code
- [x] 10.9 Update `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx`: Remove `kjToKcal` import; replace `kjToKcal(ingredient.energy_kj)` with `ingredient.energy_kcal`
- [x] 10.10 Update `frontend-food/src/pages/ingredients/IngredientCreatePage.tsx`: Rename `energyKj` state to `energyKcal`; update form label from "Energie (kJ)" to "Energie (kcal)"; submit as `energy_kcal`
- [x] 10.11 Update `frontend-food/src/pages/tools/NormPortionSimulatorPage.tsx`: Remove `kjToKcal` import; replace `kjToKcal(perPerson.energy_kj)` with `perPerson.energy_kcal`
- [x] 10.12 Update `frontend-food/src/components/ingredient/IngredientCard.tsx`: Remove `kjToKcal` import; replace with direct `energy_kcal`
- [x] 10.13 Update `frontend-food/src/components/shared/AiSuggestDialog.tsx`: Replace `energy_kj` special handling with `energy_kcal`
- [x] 10.14 Update `frontend-food/src/components/admin/RuleEditDialog.tsx`: Rename `energy_kj` to `energy_kcal` in parameter choices; update default parameter and unit
- [x] 10.15 Update `frontend-food/src/components/recipe/HintDetailModal.tsx`: Rename `energy_kj` key to `energy_kcal`
- [x] 10.16 Update `frontend-food/src/components/planning/MealActionsMenu.tsx`: Remove `external_energy_kcal` conversion (field already named correctly; just ensure it maps to new DB field)

## 11. Frontend-Food Cross-Cutting

- [x] 11.1 Search for and remove ALL remaining `kjToKcal` imports and usages across frontend-food
- [x] 11.2 Search for and remove ALL remaining `import { kjToKcal }` or `/ 4.184` patterns

## 12. Tests

- [x] 12.1 Update `backend/supply/tests/test_api.py`: Rename `energy_kj` → `energy_kcal` in test data and assertions; convert test values to kcal
- [x] 12.2 Update `backend/supply/tests/__init__.py`: Rename `energy_kj` → `energy_kcal` in factory data
- [x] 12.3 Update `backend/planner/tests/test_meal_energy_serialization.py`: Rename all `energy_kj` references and assertions
- [x] 12.4 Update `backend/planner/tests/test_scale_and_copy.py`: Update energy references and test values
- [x] 12.5 Update `backend/planner/tests/test_recipe_popularity.py`: Rename `cached_energy_kj` → `cached_energy_kcal`
- [x] 12.6 Update `backend/recipe/tests/test_api.py`: Rename `energy_kj` → `energy_kcal`
- [x] 12.7 Update `backend/recipe/tests/test_recipe_rules.py`: Rename `parameter="energy_kj"` → `parameter="energy_kcal"`; update test energy values
- [x] 12.8 Update `backend/recipe/tests/test_energy_kj_to_kcal.py`: Rewrite to test kcal-only logic (no conversion)
- [x] 12.9 Update `backend/recipe/tests/test_energy_total_cache.py`: Rename `cached_energy_total_kj` → `cached_energy_total_kcal`
- [x] 12.10 Update `backend/recipe/tests/test_cache_signals.py`: Rename all `energy_kj` → `energy_kcal`
- [x] 12.11 Update `backend/recipe/tests/test_nutrition_contributions.py`: Rename energy field references
- [x] 12.12 Update `backend/recipe/tests/test_extended_nutrition.py`: Rename energy field references; convert test values to kcal
- [x] 12.13 Update `backend/recipe/tests/test_health_traits_service.py`: Update formula tests for 4 kcal/g
- [x] 12.14 Update `backend/recipe/tests/test_suggestions.py`: Rename `cached_energy_kj` → `cached_energy_kcal`
- [x] 12.15 Update `backend/recipe/tests/test_improvement_ranking.py`: Rename energy references
- [x] 12.16 Update `backend/recipe/tests/test_nutri_improvements.py`: Rename energy references

## 13. Verification

- [x] 13.1 Run Django migration: `uv run python manage.py migrate`
- [x] 13.2 Run backend tests: `uv run pytest` (all tests pass)
- [x] 13.3 Run backend lint: `uv run ruff check backend/`
- [x] 13.4 Run frontend-food typecheck: `npm run typecheck` (workdir: frontend-food)
- [x] 13.5 Run frontend typecheck: `npm run typecheck` (workdir: frontend)
- [x] 13.6 Re-seed: `uv run python manage.py seed_all` (verify no errors)
- [x] 13.7 Search codebase for any remaining `energy_kj`, `kj_to_kcal`, `kcal_to_kj`, `kjToKcal`, `/4.184` references
- [x] 13.8 Manually verify ingredient detail page shows energy in kcal
- [x] 13.9 Manually verify recipe detail page shows energy in kcal
- [x] 13.10 Manually verify meal plan cockpit shows energy in kcal
