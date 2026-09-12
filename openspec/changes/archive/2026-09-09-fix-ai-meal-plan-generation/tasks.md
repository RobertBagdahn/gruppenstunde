## 1. Backend Schemas

- [x] 1.1 In `backend/planner/schemas/ai_generation.py`, add `AiSuggestMealItem` (recipe_id, ingredient_id, title, quantity, unit) and update `AiSuggestMeal` to support `source_meal_id` and `items: list[AiSuggestMealItem]`.
- [x] 1.2 Verify Pydantic schema validation for empty and multi-item suggestions.

## 2. Candidate Retrieval & Breakfast Pool

- [x] 2.1 In `backend/planner/services/meal_plan_ai_service.py`, implement `_get_breakfast_candidates()` to extract multi-item breakfast compositions from existing `Meal`s with items, `RefMeal`s, and approved breakfast recipes.
- [x] 2.2 In `backend/planner/services/meal_plan_ai_service.py`, implement `_get_recipe_candidates()` to fetch approved recipes split into `warm_meal`, `cold_meal`, and `snack`, scoring them for child-friendliness and popularity if indicated by the prompt.

## 3. Prompt Engineering & Completeness Auto-Fill

- [x] 3.1 In `backend/planner/services/meal_plan_ai_service.py`, update `generate_suggestions()` to inject candidate IDs and titles into the Gemini prompt with explicit instructions to select only from available candidates.
- [x] 3.2 In `backend/planner/services/meal_plan_ai_service.py`, implement `_ensure_complete_plan()` fallback engine that detects missing days/slots or invalid IDs and auto-fills them with sensible, non-repeating candidates.
- [x] 3.3 Ensure consecutive-day duplicate checks prevent identical lunch/dinner recipes.

## 4. Multi-Item Apply Implementation

- [x] 4.1 In `backend/planner/services/meal_plan_ai_service.py`, update `apply_suggestions()` to copy all items (recipes and ingredients) for multi-item breakfast meals onto the target `Meal` slot.
- [x] 4.2 Verify time-aware meal slot resolution so meals are properly created and matched without dropping items.

## 5. Frontend Schema Synchronization & Wizard Display

- [x] 5.1 In `frontend-food/src/schemas/mealPlan.ts`, update `AiSuggestMealSchema` and `AiSuggestOutSchema` to match the backend Pydantic schema with `items` and `source_meal_id`.
- [x] 5.2 In `frontend-food/src/pages/planning/wizard/StepAiPrompt.tsx`, group suggested meals by meal type (`Frühstück`, `Mittagessen`, `Abendessen`, `Snack`) and display component summaries.
- [x] 5.3 In `frontend-food/src/pages/planning/wizard/StepCockpit.tsx`, update the AI strategy preview to show categorized meals.

## 6. Testing & Verification

- [x] 6.1 In `backend/planner/tests/test_ai_generation.py`, add tests asserting that candidates are present in the Gemini prompt.
- [x] 6.2 In `backend/planner/tests/test_ai_generation.py`, add tests asserting that missing slots or invalid LLM responses trigger auto-fill, resulting in 100% complete days.
- [x] 6.3 In `backend/planner/tests/test_ai_generation.py`, add tests verifying child-friendly candidate prioritization and meal-type compatibility (no cookies or stews for breakfast).
- [x] 6.4 In `backend/planner/tests/test_apply_ai.py`, add integration tests verifying that multi-item breakfasts correctly create all `MealItem`s on the target meal.
- [x] 6.5 Run pytest and TypeScript build checks (`uv run pytest backend/planner/tests/` and `npm run build` in `frontend-food`) to verify zero regressions.
