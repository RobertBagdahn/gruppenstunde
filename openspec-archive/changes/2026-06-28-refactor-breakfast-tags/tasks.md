## 1. Backend — Model & Migration

- [x] 1.1 Add `tags = ManyToManyField("content.Tag", blank=True)` to `supply.models.Ingredient`
- [x] 1.2 Create data migration: for each Ingredient with NutritionalTag `frühstücks-basis`/`frühstücks-belag`, create or resolve corresponding `content.Tag` and add to `Ingredient.tags`
- [x] 1.3 Create cleanup migration: remove `NutritionalTag` instances `frühstücks-basis`, `frühstücks-belag`, `frühstücks-getränk`
- [x] 1.4 Run `uv run python manage.py makemigrations && uv run python manage.py migrate`

## 2. Backend — Breakfast Catalog API

- [x] 2.1 Update `supply/api/breakfast_catalog.py`: import `content.Tag` instead of `supply.NutritionalTag`; filter by `content.Tag` slug (`breakfast-base`, `breakfast-topping`)
- [x] 2.2 Update `get_drink_recipes`: filter by `content.Tag` slug `breakfast-drink` on `Recipe.tags`
- [x] 2.3 Add a `warm_meal_recipes` section to the catalog response: Recipes tagged with `breakfast-warm-meal`
- [x] 2.4 Add warm meal schemas to `BreakfastCatalogOut` (`warm_meal_recipes: list[WarmMealRecipeOut]`)

## 3. Backend — Seed Command

- [x] 3.1 Create `seed_breakfast_catalog.py`: create four `content.Tag` instances (`breakfast-base`, `breakfast-topping`, `breakfast-drink`, `breakfast-warm-meal`), tag existing/base ingredients/recipes with correct tags
- [x] 3.2 Delete old seed command files: `seed_breakfast_base_ingredients.py`, `seed_breakfast_topping_ingredients.py`, `seed_breakfast_drink_recipes.py`
- [x] 3.3 Update `seed_all.py` references to use the new consolidated command

## 4. Backend — MealItem Serializer & Schema Sync

- [x] 4.1 Update `MealItemOut` Pydantic schema: `ingredient_tags` field returns `content.Tag` slugs instead of `NutritionalTag` names
- [x] 4.2 Update the MealItem serializer/queryset logic that populates `ingredient_tags`

## 5. Frontend — Schemas

- [x] 5.1 Update `frontend-food/src/schemas/breakfast.ts`: `BreakfastCatalogSchema` includes `warm_meal_recipes` array; add `TagOut` schema for tag objects in response
- [x] 5.2 Update `frontend-food/src/schemas/mealPlan.ts`: ensure `ingredient_tags` still string array (data source changes from NutritionalTag name to Tag slug, but type remains `z.array(z.string())`)

## 6. Frontend — Tag Checks

- [x] 6.1 Update `frontend-food/src/lib/refMealToWizardState.ts`: replace `'frühstücks-basis'` with `'breakfast-base'`, `'frühstücks-belag'` with `'breakfast-topping'` in tag checks
- [x] 6.2 Update `frontend-food/src/pages/planning/RefMealEditorPage.tsx`: replace tag checks in `getItemCategory()` to use new slugs `breakfast-base` and `breakfast-topping`

## 7. Frontend — API Hooks

- [x] 7.1 Update `frontend-food/src/api/breakfast.ts`: add `useWarmMealRecipes()` or integrate warm meals into existing hooks; ensure catalog hook returns new response shape

## 8. Testing

- [x] 8.1 Update `backend/supply/tests/test_breakfast_catalog.py`: update filter targets from NutritionalTag to content.Tag in test setup and assertions; add warm meal endpoint tests
- [x] 8.2 Update `backend/planner/tests/test_ref_meal.py`: update test fixtures that reference `frühstücks-basis` tag

## 9. Documentation

- [x] 9.1 Update `frontend-food/AGENTS.md`: replace German tag names with English ones in breakfast wizard conventions section
