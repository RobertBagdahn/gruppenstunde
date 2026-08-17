## 1. Backend Models — Remove fields

- [x] 1.1 Remove 23 micronutrient fields from `supply/models/ingredient.py` (all vitamins except `vitamin_c_mg`, all minerals)
- [x] 1.2 Remove 5 cached micronutrient fields from `recipe/models/recipe.py` (`cached_vitamin_a_mg`, `cached_vitamin_d_ug`, `cached_vitamin_b12_ug`, `cached_calcium_mg`, `cached_iron_mg`)
- [x] 1.3 Remove micronutrient fields from `supply/models/reference.py` (keep only `vitamin_c_mg`)
- [x] 1.4 Create migration: `uv run python manage.py makemigrations supply recipe`
- [x] 1.5 Add data migration to delete HealthRules referencing removed parameters

## 2. Backend Schemas & Choices

- [x] 2.1 Remove fields from `supply/schemas/ingredients.py` (all 3 schema classes)
- [x] 2.2 Remove fields from `supply/schemas/reference.py`
- [x] 2.3 Remove fields from `recipe/schemas/recipes.py`
- [x] 2.4 Remove fields from `recipe/schemas/nutrition.py`
- [x] 2.5 Update `supply/choices.py` `NutrientParameterChoices` — remove vitamin/mineral entries except `VITAMIN_C_MG`

## 3. Backend Services & API

- [x] 3.1 Reduce `MICRONUTRIENT_FIELDS` in `recipe/services/recipe_checks.py` to `["vitamin_c_mg"]`
- [x] 3.2 Reduce `CACHED_MICRONUTRIENT_FIELDS` to `["vitamin_c_mg"]`
- [x] 3.3 Update `recipe/services/cockpit_service.py` — remove micronutrient aggregation for deleted fields
- [x] 3.4 Update `recipe/api/nutrition.py` — remove micronutrient response fields
- [x] 3.5 Update `supply/data/dge_reference.py` — remove vitamin/mineral keys except vitamin_c
- [x] 3.6 Update `supply/services/ingredient_ai_service.py` — remove vitamin/mineral fields from AI prompt/schema

## 4. Frontend Schemas

- [x] 4.1 Update `frontend-food/src/schemas/recipe.ts` — remove cached micronutrient fields
- [x] 4.2 Update `frontend/src/schemas/recipe.ts` — same
- [x] 4.3 Update `frontend-food/src/schemas/normPerson.ts` — remove vitamin/mineral fields
- [x] 4.4 Update `frontend/src/schemas/normPerson.ts` — same

## 5. Frontend Components

- [x] 5.1 Update `frontend-food/src/pages/recipes/RecipeDetailPage.tsx` — MicronutrientSection shows only Vitamin C

## 6. Tests & Verification

- [x] 6.1 Update `recipe/tests/test_extended_nutrition.py` — remove/adjust micronutrient tests
- [x] 6.2 Run migrations: `uv run python manage.py migrate`
- [x] 6.3 Run backend tests: `uv run pytest`
- [x] 6.4 Verify frontend builds: `npm run build` (both frontends)
