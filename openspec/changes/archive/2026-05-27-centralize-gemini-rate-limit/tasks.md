## 1. Core Module

- [x] 1.1 Create `backend/core/services/gemini.py` with `gemini_call()`, `gemini_image_call()`, global rate limit check, auth check, and centralized error handling
- [x] 1.2 Write tests for `core/services/gemini.py`: rate limit enforcement, auth rejection, error translation, bypass_limits flag

## 2. Refactor Content App

- [x] 2.1 Refactor `content/services/ai_service.py` — remove `_get_client()`, `_get_image_client()`, `_handle_gemini_exception()`; use `gemini_call()` / `gemini_image_call()`
- [x] 2.2 Refactor `content/services/ai_supply_service.py` — replace client creation with `gemini_call()`

## 3. Refactor Recipe App

- [x] 3.1 Refactor `recipe/services/suggestion_service.py` — remove `_get_client()`; use `gemini_call()`
- [x] 3.2 Refactor `recipe/services/ai_ingredients_service.py` — remove `_get_client()`; use `gemini_call()`
- [x] 3.3 Update `recipe/tests/test_suggestions.py` to mock `core.services.gemini.gemini_call` instead of `_get_client`

## 4. Refactor Supply App

- [x] 4.1 Refactor `supply/services/ingredient_ai_service.py` — remove `_get_client()`; use `gemini_call()`

## 5. Refactor Event App

- [x] 5.1 Refactor `event/api/events.py` — replace direct `genai.Client` usage with `gemini_call()`

## 6. Refactor Other Services

- [x] 6.1 Refactor `documents/text_resolver.py` — replace inline `genai.Client()` with `gemini_call()`
- [x] 6.2 Refactor `packinglist/services/suggestion_service.py` — replace client usage with `gemini_call()`

## 7. Management Commands

- [x] 7.1 Update `recipe/management/commands/normalize_recipe_portions.py` to use `gemini_call(bypass_limits=True)`

## 8. Verification

- [x] 8.1 Run full test suite to verify no regressions
- [x] 8.2 Grep for remaining direct `genai.Client(` usage outside `core/services/gemini.py` — should be zero
