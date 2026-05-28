## 1. Backend Model & Choices

- [x] 1.1 Update `HintLevelChoices` in `supply/choices.py`: rename `WARNING` to `WARN` (value `"warn"`)
- [x] 1.2 Remove `RANGE` from `HintMinMaxChoices`
- [x] 1.3 Simplify `RecipeHint` model: remove `min_value`/`max_value`, add `value` (FloatField) and `hint` (CharField for display text)
- [x] 1.4 Make `recipe_type` and `recipe_objective` required (remove `blank=True, default=""`)
- [x] 1.5 Create and run migration (`uv run python manage.py makemigrations recipe supply`)

## 2. Backend Service & API

- [x] 2.1 Update `match_recipe_hints()` in `recipe/services/recipe_checks.py`: use `hint.value` with simple min/max comparison
- [x] 2.2 Update `improvement_ranking_service.py` to pass `hint.hint` as `recommendation_text`
- [x] 2.3 Update `RecipeHintOut` Pydantic schema in `recipe/schemas/nutrition.py`
- [x] 2.4 Create Staff-only CRUD API router for RecipeHints (list, create, update, delete)
- [x] 2.5 Update `RecipeHintAdmin` in `recipe/admin.py` to reflect new fields

## 3. Frontend Schema & API

- [x] 3.1 Update `RecipeHintSchema` in `schemas/recipe.ts` and `schemas/supply.ts` (sync with Pydantic)
- [x] 3.2 Create TanStack Query hooks for RecipeHint CRUD (`api/recipeHints.ts`)

## 4. Frontend: Hint Level Styling

- [x] 4.1 Update `RecipeImprovements.tsx`: color-code cards by `hint_level` (warn=amber border+bar, error=red border+bar, info=blue/gray)
- [x] 4.2 Ensure `hint` text is displayed as `recommendation_text` in improvement cards

## 5. Frontend: Admin CRUD Page

- [x] 5.1 Create `pages/admin/RecipeHintAdminPage.tsx` with shadcn Table, filter bar (parameter, level, recipe_type, objective)
- [x] 5.2 Create Sheet-Modal for create/edit with form fields (hint, value, min_max, hint_level, parameter, recipe_type, recipe_objective, name, description, improvement_text)
- [x] 5.3 Add delete action with ConfirmDialog
- [x] 5.4 Add route `/admin/recipe-hints` with Staff auth guard
- [x] 5.5 Add navigation entry for staff users

## 6. Seed Data

- [x] 6.1 Create fixture/management command with the 20 legacy RecipeHint rules
