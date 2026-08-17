## 1. Model & Migration

- [x] 1.1 Add `manual_nutritional_tags` M2M field to `Recipe` model in `recipe/models/recipe.py`
- [x] 1.2 Create migration: `uv run python manage.py makemigrations`
- [x] 1.3 Remove preservation logic from `sync_recipe_nutritional_tags()` — pure intersection only

## 2. Sync Function

- [x] 2.1 Update `sync_recipe_nutritional_tags()` in `recipe/services/recipe_checks.py`: remove `non_dangerous_tags` preservation, only compute and set `nutritional_tags` from ingredient intersection
- [x] 2.2 Ensure the function does not touch `manual_nutritional_tags` at all

## 3. API Endpoints (Create & Update)

- [x] 3.1 In `create_recipe()`: reorder operations — save RecipeItems first (triggers sync via signal), then set `nutritional_tag_ids` on `manual_nutritional_tags`
- [x] 3.2 In `update_recipe()`: reorder — save RecipeItems first, then set `nutritional_tag_ids` on `manual_nutritional_tags`
- [x] 3.3 Ensure `.set()` on `manual_nutritional_tags` does not trigger a second sync (it won't — M2M `.set()` fires `m2m_changed`, not `post_save`)

## 4. Schema / Resolver

- [x] 4.1 Update `RecipeDetailOut.resolve_nutritional_tags` in `recipe/schemas/recipes.py` to return the union of `nutritional_tags` (auto) and `manual_nutritional_tags` (manual)

## 5. Management Command

- [x] 5.1 Fix management command comparison to use AND intersection instead of UNION (detected 129 stale recipes on first run)

## 6. Tests

- [x] 6.1 Rewrite `test_preserves_manual_non_dangerous_tags` — manual tags use `manual_nutritional_tags`, survive sync
- [x] 6.2 Add `test_sync_intersection_only` — sync removes tag when ingredient doesn't share it
- [x] 6.3 Add `test_resolve_nutritional_tags_merges_both_sources` — both sources in response
- [x] 6.4 Add `test_manual_tags_preserved_on_sync` — manual tags survive sync
- [x] 6.5 Add `test_manual_tags_survive_ingredient_change` — manual tags survive ingredient changes
- [x] 6.6 All 8 tests pass: `uv run pytest recipe/tests/test_recipe_nutritional_sync.py -v`

## 7. Migration & Sync

- [x] 7.1 Run migration: `uv run python manage.py migrate`
- [x] 7.2 Run management command: 129/165 recipes updated (stale tags removed)
- [x] 7.3 Verify: management command now uses AND intersection for correct comparison
