## 1. Backend Model: Ingredient standalone fields

- [x] 1.1 Add `is_standalone_food` (BooleanField, default=False) and `standalone_type` (CharField, choices=RecipeTypeChoices, null=True, blank=True) to Ingredient model in `backend/supply/models/ingredient.py`
- [x] 1.2 Create and run migration for supply app

## 2. Backend Model: MealPlanItem ingredient support

- [x] 2.1 Add `ingredient` (FK to Ingredient, null=True), `portion` (FK to Portion, null=True), `quantity` (DecimalField, null=True) to MealPlanItem in `backend/planner/models/`
- [x] 2.2 Add CheckConstraint for recipe XOR ingredient
- [x] 2.3 Create and run migration for planner app

## 3. Backend API: Unified search endpoint

- [x] 3.1 Create Pydantic response schema with `recipes` and `ingredients` arrays (ingredients include portions)
- [x] 3.2 Modify `search_recipes` in `backend/planner/api/meal_plan.py` to query standalone ingredients alongside recipes
- [x] 3.3 Return new response format `{recipes: [...], ingredients: [...]}`

## 4. Backend API: MealPlanItem creation for ingredients

- [x] 4.1 Update MealPlanItem create/update schemas to accept optional `ingredient_id`, `portion_id`, `quantity`
- [x] 4.2 Update MealPlanItem create endpoint to handle ingredient-based items
- [x] 4.3 Update MealPlanItem list/detail schemas to include ingredient data

## 5. Frontend: Zod schemas and API hooks

- [x] 5.1 Update search response Zod schema to match new `{recipes, ingredients}` format
- [x] 5.2 Update `useRecipeSearch` hook to handle new response structure
- [x] 5.3 Update MealPlanItem Zod schema with optional ingredient/portion/quantity fields

## 6. Frontend: RecipeSearchDialog with ingredient results

- [x] 6.1 Render ingredients as separate section in search results (below recipes)
- [x] 6.2 Create IngredientQuantityDialog component (portion select + quantity input)
- [x] 6.3 Wire ingredient selection → quantity dialog → MealPlanItem creation

## 7. Frontend: MealPlan display for ingredient items

- [x] 7.1 Update MealPlan day/meal display to show ingredient items (name + portion + quantity)
