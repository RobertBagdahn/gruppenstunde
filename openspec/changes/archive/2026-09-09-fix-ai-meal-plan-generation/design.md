## Context

The meal plan wizard in `frontend-food` allows leaders to generate a complete meal plan using Gemini AI (`POST /api/meal-plans/ai/suggest/`). Currently, the backend implementation in `planner/services/meal_plan_ai_service.py` sends a prompt demanding the LLM to output existing database `recipe_id`s, but omits any recipe catalog or candidate IDs from the prompt. Consequently:
1. Gemini blindly guesses integer IDs.
2. The backend filters against `Recipe.objects.filter(id__in=[...])`. Hallucinated IDs are dropped, leaving days and meal slots completely blank.
3. Colliding IDs link random, inappropriate items (e.g. ID 187 is "Keksaufstrichbrot", which Gemini didn't mean, leading to breakfasts made solely of cookies).
4. Unit tests in `planner/tests/test_ai_generation.py` masked this failure by mocking Gemini to return an ID created directly by the test.

Furthermore, real scout camps structure breakfasts as multi-item setups (bread, butter, cheese, jams, muesli, fruit) rather than isolated single cooking recipes. The platform already contains multi-item breakfast meals (in `Meal` and `RefMeal`) and an intelligent scoring engine (`IntelligentSuggestionsService`), but none of these were integrated into the AI planner.

## Goals / Non-Goals

**Goals:**
- **Candidate Injection**: Pass approved recipes and structured breakfast meal compositions directly into the LLM prompt.
- **Breakfasts from Existing Meals**: Allow breakfast slots to be fulfilled by complete multi-item breakfast setups from other existing meals or reference meals.
- **100% Slot Completeness**: Ensure that every requested day has all required meals (breakfast, lunch, dinner, and optional snack) populated without any blank slots.
- **Plausibility & Child-Friendliness**: Ensure meal types match slot types (no warm dinners as breakfasts) and prioritize kid-friendly classics when the prompt mentions children.
- **Multi-Item Apply**: Ensure `POST /api/meal-plans/{id}/apply-ai/` accurately instantiates all items (ingredients and recipes) for multi-item breakfasts.
- **Frontend Grouping**: Render suggestions grouped by meal type with informative item lists.
- **Rigorous Testing**: Add tests asserting candidate injection in prompt, completeness guarantee, meal-type filtering, child scoring, and end-to-end plan creation.

**Non-Goals:**
- Replacing or modifying the interactive Breakfast Wizard (`BreakfastWizardPage.tsx`) or manual meal creation.
- Changing the underlying database models (`MealPlan`, `Meal`, `MealItem`, `Recipe`).
- Automatic real-time recalculation of nutritional targets beyond existing `effective_portions` signals.

## Decisions

### 1. Dual-Catalog Prompt Architecture
- **Decision**: Partition candidates into two distinct catalogs in the prompt:
  1. `breakfast_options`: Curated multi-item breakfast meals (sourced from existing `Meal.objects.filter(meal_type='breakfast', items__isnull=False)` and `RefMeal`s, plus approved breakfast recipes). Each option has an ID, title, and item summary (e.g., "Klassisches Pfadfinder-Frühstück (Graubrot, Butter, Gouda, Marmelade, Gurke)").
  2. `recipe_options`: Approved recipes (`status='approved'`) grouped into warm meals, cold meals, and snacks.
- **Rationale**: LLMs can easily pick from ~50–150 structured items in Gemini Flash's 1M context window. Providing candidate lists eliminates ID hallucination entirely.
- **Alternative considered**: Free-text dish generation + semantic search vector matching. Rejected because fuzzy vector matching might still select inappropriate or nonexistent items, whereas candidate selection is deterministic and guaranteed to exist.

### 2. Auto-Fill Fallback for 100% Slot Completeness
- **Decision**: If Gemini skips a slot or returns an invalid ID, the backend post-processing detects the missing slot and fills it automatically using the highest-ranked candidate from `IntelligentSuggestionsService` or standard kid-friendly defaults.
- **Rationale**: An AI response should never leave a user with a half-empty plan. A solid fallback guarantees a 100% usable plan even if the LLM output is malformed or sparse.

### 3. Extended Suggestion Schema (`AiSuggestMeal`)
- **Decision**: Extend `AiSuggestMeal` to support both single recipes and multi-item breakfast compositions:
  ```python
  class AiSuggestMealItem(Schema):
      recipe_id: int | None = None
      ingredient_id: int | None = None
      title: str
      quantity: float | None = None
      unit: str | None = None

  class AiSuggestMeal(Schema):
      meal_type: str
      recipe_id: int | None = None
      recipe_title: str
      source_meal_id: int | None = None
      items: list[AiSuggestMealItem] = []
  ```
- **Rationale**: Keeps backward compatibility with existing single-recipe meals while enabling multi-item breakfasts to be visualized in the frontend and applied to the database.

### 4. Child-Friendly Context Scoring
- **Decision**: When user prompt contains terms like "kind", "kinder", "wölfling", "jupfi", prioritize recipes with high popularity, low difficulty, and tags matching camp classics, downranking overly niche or complex dishes.

## Affected Files and APIs

### Backend
- `backend/planner/services/meal_plan_ai_service.py`:
  - `_build_candidate_catalogs(prompt, nutritional_tags, budget)`: Gathers approved recipes & breakfast setups.
  - `generate_suggestions()`: Injects catalogs into prompt, validates response, applies completeness auto-fill.
  - `apply_suggestions()`: Handles both single recipe items and multi-item breakfast meals.
- `backend/planner/schemas/ai_generation.py`:
  - `AiSuggestMealItem`, updated `AiSuggestMeal` and `AiSuggestDay`.
- `backend/planner/api/ai_generation.py`:
  - Router endpoints `POST /api/meal-plans/ai/suggest/` and `POST /api/meal-plans/{id}/apply-ai/`.
- `backend/planner/tests/test_ai_generation.py`:
  - Unit tests for catalog injection, auto-fill fallback, invalid response resilience.
- `backend/planner/tests/test_apply_ai.py`:
  - Integration tests for multi-item breakfast application and single recipe application.

### Frontend
- `frontend-food/src/schemas/mealPlan.ts`:
  - Sync `AiSuggestMealSchema` with `items` and `source_meal_id`.
- `frontend-food/src/pages/planning/wizard/StepAiPrompt.tsx`:
  - Group generated meals by `meal_type` (Frühstück, Mittagessen, Abendessen, Snack) with item badges.
- `frontend-food/src/pages/planning/wizard/StepCockpit.tsx`:
  - Categorized summary preview before plan creation.

### Database Migrations
- **None**: No changes to database tables or fields.

## Risks / Trade-offs

- **[Risk]** The database might have very few breakfast meals with items in a fresh installation.
  - **Mitigation**: If fewer than 2 breakfast meals with items exist, seed/fallback to the default breakfast recipes (`Porridge`, `Pfannkuchen`, `Rührei`, `Müsli mit frischem Obst`) so candidate generation is always fully populated.
- **[Risk]** Gemini timeout if context is too large.
  - **Mitigation**: Compact catalog formatting (only ID, title, and minimal tags; ~5–10 KB total payload), well within Gemini's sub-second latency envelope.
- **[Risk]** LLM repeats the same lunch on consecutive days.
  - **Mitigation**: Post-generation validator enforces recipe variety across consecutive days, replacing duplicates via the auto-fill engine.
