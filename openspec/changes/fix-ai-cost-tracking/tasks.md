## 1. Pricing & model consistency

- [x] 1.1 Replace `GEMINI_MODEL = "gemini-2.5-flash-lite"` with `gemini-3.1-flash-lite` in `backend/core/management/commands/batch_generate_default_portions.py`
- [x] 1.2 Add `logger.warning` in `_calculate_cost_eur` for unknown models in `backend/core/services/gemini.py`
- [x] 1.3 Fix thinking-token double count (completion = `candidates_token_count` only) in `backend/core/services/gemini.py`
- [x] 1.4 Add tests for unknown-model warning and thinking-token cost calculation

## 2. Background flagging

- [x] 2.1 Pass `is_background=True` through `ai_create_ingredient` in `backend/supply/services/ingredient_ai_suggest_service.py` for the import command
- [x] 2.2 Pass `is_background=True` through `estimate_quantities` for `repair_portion_integrity`
- [x] 2.3 Add tests asserting background interactions are excluded from user-cost totals

## 3. Context aggregation

- [x] 3.1 Sync `AiContextChoices` in `backend/content/choices.py` with real `context` strings
- [x] 3.2 Fix `by_context` loop in `backend/content/api/admin.py` to aggregate against stored values
- [x] 3.3 Sync `frontend-food/src/lib/aiContextLabels.ts` if labels change

## 4. Dashboard formatting

- [x] 4.1 Change `KiKostenPage.tsx` to render `total_cost_eur` with 2 decimals (align with `ai-cost-dashboard`)
- [x] 4.2 Verify cost cards and context table format consistently

## 5. Rate limit

- [x] 5.1 Change `GLOBAL_LIMIT` to 100 and `WINDOW_SECONDS` to 900 in `backend/core/services/gemini.py`
- [x] 5.2 Update tests for the new limit/window

## 6. Verification

- [x] 6.1 Run `uv run python manage.py makemigrations --check`
- [x] 6.2 Run `uv run pytest`
