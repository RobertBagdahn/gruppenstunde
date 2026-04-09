## 1. Fix record_view in helpers.py

- [x] 1.1 Add `BOT_PATTERNS` regex and `is_bot()` function to `backend/content/api/helpers.py` (from `view_service.py`)
- [x] 1.2 Add bot-check to `record_view()`: return `False` early if `is_bot(user_agent)` is `True`
- [x] 1.3 Add atomic `view_count` increment using `F('view_count') + 1` after creating `ContentView` record
- [x] 1.4 Add `re` and `F` imports to `helpers.py`

## 2. Add record_view to Recipe API

- [x] 2.1 Add `record_view` to imports in `backend/recipe/api/recipes.py` (from `content.base_api`)
- [x] 2.2 Call `record_view(Recipe, recipe.id, request)` in `get_recipe()` endpoint
- [x] 2.3 Call `record_view(Recipe, recipe.id, request)` in `get_recipe_by_slug()` endpoint

## 3. Consistency: Recipe sort key

- [x] 3.1 Change sort key `"most_viewed"` to `"popular"` in `backend/recipe/api/recipes.py` sort_map
- [x] 3.2 Check frontend for `most_viewed` references and update to `popular` if found

## 4. Cleanup

- [x] 4.1 Delete dead code file `backend/content/services/view_service.py`
- [x] 4.2 Verify no imports reference `content.services.view_service` anywhere

## 5. Verification

- [x] 5.1 Run backend tests: `uv run python -m pytest backend/ -x`
- [x] 5.2 Verify `record_view` is called in all 4 content type detail endpoints (session, blog, game, recipe)
