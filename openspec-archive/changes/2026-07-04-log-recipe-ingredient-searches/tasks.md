## 1. Structured Logging Helper

- [x] 1.1 Add `log_search_structured()` function in `backend/content/services/search_service.py` that writes a JSON log line via `logger.info()` with fields: event, query, results_count, user_id, timestamp, source

## 2. Recipe Search Logging

- [x] 2.1 Import `log_search` and `log_search_structured` in `backend/recipe/api/recipes.py`
- [x] 2.2 Add `log_search()` call in `list_recipes()` after pagination, gated by `if filters.q:`, passing `filters.q`, `result["total"]`, and `request.user`
- [x] 2.3 Add `log_search_structured()` call in `list_recipes()` alongside `log_search()` with source=`"recipe_list"`

## 3. Ingredient Search Logging

- [x] 3.1 Import `log_search` and `log_search_structured` in `backend/supply/api/ingredients.py`
- [x] 3.2 Add `log_search()` call in `list_ingredients()` after computing `total`, gated by `if name:`, passing `name`, `total`, and `request.user`
- [x] 3.3 Add `log_search_structured()` call in `list_ingredients()` alongside `log_search()` with source=`"ingredient_list"`

## 4. Tests

- [x] 4.1 Write test in `backend/recipe/tests/` verifying that a `SearchLog` entry is created when `GET /api/recipes/?q=Pfannkuchen` is called
- [x] 4.2 Write test verifying that no `SearchLog` entry is created when `GET /api/recipes/` is called without `q`
- [x] 4.3 Write test in `backend/supply/tests/` verifying that a `SearchLog` entry is created when `GET /api/ingredients/?name=Mehl` is called
- [x] 4.4 Write test verifying that no `SearchLog` entry is created when `GET /api/ingredients/` is called without `name`
- [x] 4.5 Write test verifying that anonymous searches create `SearchLog` with `user=None` for both endpoints
