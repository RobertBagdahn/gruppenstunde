## 1. Central prompt context builder

- [x] 1.1 Implement `build_prompt_context()` in `backend/core/services/gemini.py` (or new `prompt_context.py`) collecting dietary tags, group size, season, pantry summary
- [x] 1.2 Add tests for context builder (empty, partial, full data; no private data leak)

## 2. Recipe AI vote IDs

- [x] 2.1 Thread `ai_interaction_id` through `ai_create_recipe` and `suggest_recipe_metadata` in `backend/recipe/services/recipe_ai_suggest_service.py`
- [x] 2.2 Add `ai_interaction_id` to recipe response schemas (Pydantic) and Zod (`frontend-food/src/schemas/recipes.ts`)
- [x] 2.3 Render `AiVoteButtons` in the recipe wizard/creation surface

## 3. Recipe ingredient & step AI vote IDs

- [x] 3.1 Thread ID through `ai_ingredients_service`, `step_ai_service`, `suggestion_service`
- [x] 3.2 Wrap list responses with `ai_interaction_id`; update Pydantic + Zod schemas
- [x] 3.3 Render `AiVoteButtons` in ingredient editor and recipe improvements UI

## 4. Meal plan & intelligent suggestions vote IDs + context

- [x] 4.1 Add `ai_interaction_id` to `planner/schemas/ai_generation.py` and `AiSuggestOut`
- [x] 4.2 Thread ID through `meal_plan_ai_service` and `intelligent_suggestions_service`
- [x] 4.3 Add season/context to meal plan prompt via `build_prompt_context()`
- [x] 4.4 Render `AiVoteButtons` in MealPlan wizard and IntelligentSuggestions grid

## 5. Ingredient create vote ID + context

- [x] 5.1 Return `ai_interaction_id` from `ai_create_ingredient` and add to `IngredientDetailOut` (Pydantic + Zod)
- [x] 5.2 Pass `interactionId` to `AiSuggestDialog` in `IngredientDetailPage.tsx`
- [x] 5.3 Add context block to ingredient suggestion prompts

## 6. Prompt context enrichment for supply

- [x] 6.1 Enrich `ai_supply_service` prompts with group size / dietary context

## 7. Verification

- [x] 7.1 Sync Zod schemas after all Pydantic changes
- [x] 7.2 Run `uv run python manage.py makemigrations --check`
- [ ] 7.3 Run `uv run pytest`
