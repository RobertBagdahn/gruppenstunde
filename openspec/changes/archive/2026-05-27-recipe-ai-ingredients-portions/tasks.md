## 1. Backend Service — AI Ingredients Suggestion

- [x] 1.1 Create `backend/recipe/services/ai_ingredients_service.py` with Pydantic schemas (`AiIngredientSuggestion`, `AiIngredientsOutput`) and `RecipeAiIngredientsService` class
- [x] 1.2 Implement `suggest_ingredients(recipe)` method: build prompt from recipe title/description/type, call Gemini Flash with structured output, return list of ingredient names + estimated grams
- [x] 1.3 Implement `match_ingredients(suggestions)` method: match names against `Ingredient.name`, `Ingredient.slug`, `IngredientAlias.name` (case-insensitive), create missing Ingredients with `status="ai_generated"`
- [x] 1.4 Implement `assign_portions(matched_items)` method: for each ingredient select best Portion (is_default > priority > create "Gramm" fallback), calculate quantity as `estimated_grams / portion.weight_g`

## 2. Backend API Endpoints

- [x] 2.1 Add Pydantic response schemas in `backend/recipe/schemas/items.py`: `AiIngredientSuggestionOut` (ingredient_id, ingredient_name, portion_id, portion_name, quantity, measuring_unit_id, measuring_unit_name)
- [x] 2.2 Add `POST /{recipe_id}/ai-suggest-ingredients/` endpoint in `backend/recipe/api/items.py` — calls service, returns suggestions without persisting
- [x] 2.3 Add `POST /{recipe_id}/ai-apply-ingredients/` endpoint — receives suggestion list, creates RecipeItems, recalculates cache

## 3. Frontend Integration

- [x] 3.1 Add Zod schema + TanStack Query hook `useAiSuggestIngredients` (mutation) and `useAiApplyIngredients` (mutation)
- [ ] 3.2 Add "KI Zutaten vorschlagen" button in recipe edit step 2 that triggers suggestion, shows preview, and allows applying
  - **BLOCKED**: Recipe creation wizard page does not exist in frontend yet. Hooks are ready to be used once the page is built.
