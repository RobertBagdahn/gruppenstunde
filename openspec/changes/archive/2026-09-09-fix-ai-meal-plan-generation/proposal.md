## Why

The current AI-assisted meal plan generator (`POST /api/meal-plans/ai/suggest/`) generates nonsensical, incomplete, and unusable plans. The prompt asks Gemini to pick existing database recipes by integer ID without ever providing the database's recipes or candidate IDs in the prompt context. As a result, Gemini hallucinates arbitrary IDs which are either silently discarded by the backend (leaving days and meal slots completely empty) or accidentally collide with unrelated records in the database (e.g. assigning single cookie spreads or test recipes as full breakfasts).

This change fixes the AI meal planning pipeline by injecting verified candidate recipes into the prompt, reusing structured breakfast setups from existing meals/reference meals instead of single random recipes, guaranteeing 100% complete slot coverage via intelligent fallbacks, and adding rigorous automated tests to ensure plausible, child-friendly camp meal plans.

## What Changes

- **Candidate Catalog Injection**: Inject approved, context-filtered recipes (split by `warm_meal`, `cold_meal`, `snack`) with IDs, titles, and tags directly into the prompt so the LLM selects exclusively from real candidates.
- **Breakfasts from Existing Meals**: Source breakfast configurations from established, multi-item breakfast meals (or reference meals) in the system so breakfasts consist of complete, realistic breakfast setups (bread, toppings, muesli, fruit) rather than isolated single recipes.
- **Prompt Intent & Audience Scoring**: Optimize candidate selection for user context, specifically prioritizing popular, child-friendly, and camp-proven recipes when the prompt mentions children ("Kinder", "Wölflinge", "Jupfi").
- **100% Slot Completeness Guarantee**: Ensure every requested day and meal slot (breakfast, lunch, dinner, and optional snack) is filled. If Gemini leaves a slot empty or suggests an invalid candidate, an automatic fallback fills the slot so plans are never incomplete.
- **Strict Meal-Type Plausibility**: Validate that meal slots only receive compatible recipe types (e.g., breakfast slots never receive soups or dinner dishes; lunch/dinner receive substantial meals; no consecutive-day duplicates).
- **Multi-Item Breakfast Application**: Upgrade `apply_suggestions` (`POST /api/meal-plans/{id}/apply-ai/`) so that breakfasts sourced from reference/existing meals copy their full item compositions (ingredients and recipes) onto the created meals.
- **Frontend Wizard Display Polish**: Update `StepAiPrompt.tsx` and `StepCockpit.tsx` to group suggested meals clearly by meal type (`Frühstück`, `Mittagessen`, `Abendessen`, `Snack`) and show component summaries instead of indistinguishable pill tags.
- **End-to-End Test Suite**: Add comprehensive tests that verify prompt candidate injection, non-empty auto-fill fallbacks, meal-type plausibility, and full `suggest` -> `apply` integration.

## Capabilities

### New Capabilities
- `ai-meal-plan-generation`: Generates complete, plausible meal plans using candidate catalog injection, breakfasts sourced from existing meals/templates, strict meal-type validation, deterministic auto-fill fallbacks, and multi-item application.

### Modified Capabilities
<!-- No requirement changes to existing capability specs -->

## Impact

- **Backend Django Apps**:
  - `planner/services/meal_plan_ai_service.py`: Complete overhaul of candidate retrieval, prompt generation, validation, fallback auto-fill, and multi-item apply.
  - `planner/schemas/ai_generation.py`: Extended schemas supporting breakfast source items/compositions and structured meal types.
  - `planner/api/ai_generation.py`: Integration of upgraded service.
  - `planner/tests/test_ai_generation.py` & `planner/tests/test_apply_ai.py`: Overhaul with realistic database models, prompt checks, and completeness assertions.
- **Frontend Food**:
  - `frontend-food/src/schemas/mealPlan.ts`: Sync `AiSuggestMealSchema` and `AiSuggestOutSchema` with backend Pydantic schemas.
  - `frontend-food/src/pages/planning/wizard/StepAiPrompt.tsx`: Structured display of suggestions grouped by meal type with items details.
  - `frontend-food/src/pages/planning/wizard/StepCockpit.tsx`: Structured preview before meal plan creation.
- **Database Migrations**:
  - None required. All existing models (`MealPlan`, `Meal`, `MealItem`, `Recipe`) remain unchanged.
