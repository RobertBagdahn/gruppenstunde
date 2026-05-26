## 1. Backend Models — Erweiterte Nährwertfelder

- [x] 1.1 Add 13 vitamin fields to `Ingredient` model (`backend/supply/models/ingredient.py`): vitamin_a_mg, vitamin_b1_mg, vitamin_b2_mg, vitamin_b6_mg, vitamin_b12_ug, vitamin_c_mg, vitamin_d_ug, vitamin_e_mg, vitamin_k_ug, niacin_mg, folate_ug, pantothenic_acid_mg, biotin_ug (all nullable FloatField, default=None)
- [x] 1.2 Add 12 mineral fields to `Ingredient` model: calcium_mg, iron_mg, magnesium_mg, zinc_mg, potassium_mg, phosphorus_mg, iodine_ug, selenium_ug, copper_mg, manganese_mg, chromium_ug, fluoride_mg (all nullable FloatField, default=None)
- [x] 1.3 Add `improvement_text` field (TextField, blank=True, default="") to `RecipeHint` model (`backend/recipe/models/hints.py`)
- [x] 1.4 Add `HintParameterChoices` entries for new vitamin/mineral parameters in `backend/supply/choices.py`: vitamin_c_mg, vitamin_a_mg, vitamin_d_ug, vitamin_b12_ug, folate_ug, calcium_mg, iron_mg, magnesium_mg, zinc_mg, potassium_mg, weight_g, nutri_class
- [x] 1.5 Add 10 cached micronutrient fields to `Recipe` model (`backend/recipe/models/recipe.py`): cached_vitamin_a_mg, cached_vitamin_c_mg, cached_vitamin_d_ug, cached_vitamin_b12_ug, cached_calcium_mg, cached_iron_mg, cached_magnesium_mg, cached_zinc_mg, cached_potassium_mg, cached_folate_ug
- [x] 1.6 Create `DgeReference` model in `backend/supply/models/` with fields: age_min, age_max, gender, all macro/vitamin/mineral reference values, sugar_g_max, salt_g_max, fat_sat_g_max, sodium_mg_max
- [x] 1.7 Run `uv run python manage.py makemigrations supply recipe` and verify migrations

## 2. Backend Admin — Erweiterte Oberflächen

- [x] 2.1 Extend `IngredientAdmin` fieldsets in `backend/supply/admin.py`: Add "Vitamine" fieldset (13 fields) and "Mineralstoffe" fieldset (12 fields)
- [x] 2.2 Register `HealthRule` in Django admin (`backend/recipe/admin.py`) with list_display (name, parameter, scope, threshold_green, threshold_yellow, unit, is_active), list_filter (scope, parameter, is_active), search_fields (name, tip_text), list_editable (threshold_green, threshold_yellow, is_active)
- [x] 2.3 Extend `RecipeHintAdmin` in `backend/recipe/admin.py`: Add improvement_text to list, add list_editable for hint_level
- [x] 2.4 Register `DgeReference` in Django admin with list_display (age_min, age_max, gender), list_filter (gender), and organized fieldsets for macros/vitamins/minerals

## 3. Backend Schemas — Pydantic Schema-Erweiterungen

- [x] 3.1 Extend `IngredientDetailOut` in `backend/supply/schemas/ingredients.py` with 25 optional vitamin/mineral fields
- [x] 3.2 Extend `IngredientCreateIn` and `IngredientUpdateIn` with optional vitamin/mineral fields
- [x] 3.3 Extend `RecipeListOut` in `backend/recipe/schemas/recipes.py` with 10 cached micronutrient fields
- [x] 3.4 Extend `RecipeItemNutritionOut` in `backend/recipe/schemas/nutrition.py` with 25 micronutrient fields
- [x] 3.5 Extend `RecipeNutritionBreakdownOut` with micronutrient totals, per-serving values, and `dge_coverage` dict
- [x] 3.6 Add `improvement_text` to `RecipeHintOut` and `RecipeHintMatchOut` in `backend/recipe/schemas/nutrition.py`
- [x] 3.7 Create `DgeReferenceOut` schema and `PaginatedDgeReferenceOut` in `backend/supply/schemas/`
- [x] 3.8 Extend `HealthRuleOut` in `backend/recipe/schemas/cockpit.py` (verify all fields present)

## 4. Backend Services — Logik-Erweiterungen

- [x] 4.1 Extend `recalculate_recipe_cache()` in `backend/recipe/services/recipe_checks.py` to aggregate 10 micronutrient values from RecipeItems
- [x] 4.2 Extend `get_recipe_nutritional_values()` to include vitamin/mineral aggregation
- [x] 4.3 Extend `match_recipe_hints()` to support new vitamin/mineral parameters and include improvement_text in response
- [x] 4.4 Extend nutrition breakdown endpoint logic to calculate DGE coverage percentages using `DgeReference` model
- [x] 4.5 Extend cockpit aggregation functions (`_aggregate_meal_values`, `_aggregate_day_values`) to include vitamin/mineral sums
- [x] 4.6 Update `update_ingredient_nutri_score()` in `backend/supply/services/nutri_service.py` if needed (Nutri-Score itself stays unchanged, but signal chain must handle new fields)

## 5. Backend API — Endpoint-Erweiterungen

- [x] 5.1 Add optional query parameters `age` and `gender` to `GET /api/recipes/{id}/nutrition-breakdown/` for DGE reference selection
- [x] 5.2 Create `GET /api/dge-references/` endpoint in supply API router returning list of all DgeReference entries
- [x] 5.3 Verify existing ingredient CRUD endpoints handle new vitamin/mineral fields correctly (create/update/detail)
- [x] 5.4 Verify recipe hints endpoint returns improvement_text

## 6. Backend Seed Data — Umfassende Regeldaten

- [x] 6.1 Extend `seed_all.py` with 50+ RecipeHint rules: macronutrient rules (energy, protein, fat, fat_sat, carbohydrate, sugar, salt, sodium, fibre, nutri_class, weight) with improvement_text
- [x] 6.2 Add vitamin RecipeHint rules to seed: vitamin_c, vitamin_a, vitamin_d, vitamin_b12, folate (6 rules)
- [x] 6.3 Add mineral RecipeHint rules to seed: calcium, iron, magnesium, zinc, potassium (7 rules)
- [x] 6.4 Add recipe-type-specific RecipeHint rules: breakfast (3), snack (3), drink (2)
- [x] 6.5 Extend HealthRule seed data to 20+ rules: day-scope vitamin/mineral rules (12 new) + meal-scope rules (3 new)
- [x] 6.6 Add DgeReference seed data: 10 age groups x 2 genders with all macro/vitamin/mineral values from official DGE D-A-CH tables
- [x] 6.7 Ensure seed is idempotent (get_or_create or update_or_create pattern)
- [x] 6.8 Run `uv run python manage.py seed_all` and verify all data is created

## 7. Frontend Schemas — Zod Schema-Sync

- [x] 7.1 Extend ingredient Zod schema with 25 optional vitamin/mineral fields (matching Pydantic IngredientDetailOut)
- [x] 7.2 Extend recipe Zod schema with 10 cached micronutrient fields (matching RecipeListOut)
- [x] 7.3 Extend nutrition breakdown Zod schema with micronutrient totals, per-serving values, and dge_coverage object
- [x] 7.4 Extend recipe hint Zod schema with improvement_text field
- [x] 7.5 Create DgeReference Zod schema matching DgeReferenceOut

## 8. Frontend UI — Nährwerttabelle und Anzeige

- [x] 8.1 Extend recipe detail nutrition table with collapsible "Vitamine" and "Mineralstoffe" sections (mobile-first, collapsed by default)
- [x] 8.2 Add DGE coverage percentage column to nutrition table (bar or percentage display)
- [x] 8.3 Extend ingredient detail page with vitamin/mineral display in organized groups
- [x] 8.4 Display improvement_text in recipe hint cards/tooltips
- [x] 8.5 Add TanStack Query hook for `GET /api/dge-references/` endpoint

## 9. Testing

- [x] 9.1 Write pytest tests for Ingredient model with vitamin/mineral fields (create, update, null handling)
- [x] 9.2 Write pytest tests for DgeReference model and seed data
- [x] 9.3 Write pytest tests for extended recalculate_recipe_cache with micronutrients
- [x] 9.4 Write pytest tests for RecipeHint matching with new vitamin/mineral parameters
- [x] 9.5 Write pytest tests for nutrition breakdown endpoint with DGE coverage
- [x] 9.6 Write pytest tests for cockpit service with vitamin/mineral HealthRules
- [x] 9.7 Run full test suite: `uv run pytest` and fix any failures

## 10. Migration und Deployment

- [x] 10.1 Run `uv run python manage.py migrate` on local database
- [x] 10.2 Run `uv run python manage.py seed_all` to populate new rules and DGE data
- [x] 10.3 Verify Django admin shows all new fieldsets, rules, and DGE references correctly
- [x] 10.4 Verify recipe nutrition breakdown API returns extended data
- [x] 10.5 Verify cockpit dashboard includes vitamin/mineral evaluations
