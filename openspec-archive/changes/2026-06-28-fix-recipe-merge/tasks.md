## 1. Backend — LinkType & Schemas

- [x] 1.1 Add `DUPLICATE_MERGED = "duplicate_merged"` to `LinkType` choices in `backend/content/choices.py`
- [x] 1.2 Create `RecipeMergePreviewOut` Pydantic schema in `backend/content/schemas/data_quality.py` with fields: `source_id`, `source_name`, `target_id`, `target_name`, `affected_meal_count`
- [x] 1.3 Add `RecipeMergePreviewOut` to the schema imports in `backend/content/api/data_quality.py`

## 2. Backend — Recipe Merge Preview Endpoint

- [x] 2.1 Add `GET /api/admin/data-quality/recipes/merge/preview/` endpoint to `backend/content/api/data_quality.py`
- [x] 2.2 Endpoint SHALL accept `source_id` and `target_id` query params, look up both recipes, count `Meal.objects.filter(recipe=source).count()`
- [x] 2.3 Return `RecipeMergePreviewOut` with reference count, source/target names
- [x] 2.4 Handle 404 if either recipe not found, 400 if source == target

## 3. Backend — Recipe Merge Execute Endpoint

- [x] 3.1 Add `POST /api/admin/data-quality/recipes/merge/` endpoint to `backend/content/api/data_quality.py`
- [x] 3.2 Accept `MergeRequestIn` (reuse existing schema: `source_id`, `target_id`)
- [x] 3.3 Soft-delete source recipe: `source.soft_delete()`
- [x] 3.4 Create ContentLink: `ContentLink.objects.create(source=source, target=target, link_type=LinkType.DUPLICATE_MERGED, created_by=request.user)`
- [x] 3.5 Handle 404 if either recipe not found, 400 if source == target or already merged

## 4. Backend — Recipe Dismiss Endpoints

- [x] 4.1 Add `POST /api/admin/data-quality/recipes/duplicates/dismiss/` endpoint to `backend/content/api/data_quality.py`
- [x] 4.2 Create `DuplicateDismissal` entry for the recipe pair (using Recipe ContentType)
- [x] 4.3 Add `DELETE /api/admin/data-quality/recipes/duplicates/dismiss/` endpoint to remove DuplicateDismissal
- [x] 4.4 Create `RecipeDismissRequestIn` schema with `recipe_a_id` and `recipe_b_id` fields

## 5. Backend — Dismissal-Filter in recipe_duplicates

- [x] 5.1 Add DuplicateDismissal filtering to `recipe_duplicates()` endpoint: exclude pairs that have been dismissed
- [x] 5.2 Load dismissed pairs for Recipe ContentType, filter out seen + dismissed pairs (analogous to ingredient logic at line 271)

## 6. Frontend — Zod Schemas & Types

- [x] 6.1 Add `RecipeMergePreviewSchema` to `frontend-food/src/schemas/dataQuality.ts` with fields: `source_id`, `source_name`, `target_id`, `target_name`, `affected_meal_count`
- [x] 6.2 Add `RecipeMergePreview` type export

## 7. Frontend — Recipe-spezifische Hooks

- [x] 7.1 Add `useRecipeMergePreview(sourceId, targetId)` hook in `frontend-food/src/api/dataQuality.ts` that calls `/recipes/merge/preview/`
- [x] 7.2 Add `useRecipeMerge()` mutation hook that calls `/recipes/merge/`
- [x] 7.3 Add `useRecipeDismissDuplicate()` mutation hook that calls `POST /recipes/duplicates/dismiss/`
- [x] 7.4 Add `useRecipeUndismissDuplicate()` mutation hook that calls `DELETE /recipes/duplicates/dismiss/`

## 8. Frontend — DuplicateDetectionList Routing-Fix

- [x] 8.1 In `DuplicateDetectionList.tsx`, when `type === 'recipe'`, use recipe-specific hooks instead of ingredient hooks
- [x] 8.2 Replace `useMergeIngredients()` with `useRecipeMerge()` when `type === 'recipe'`
- [x] 8.3 Replace `useMergePreview()` with `useRecipeMergePreview()` when `type === 'recipe'`
- [x] 8.4 Replace `useDismissDuplicate()` with `useRecipeDismissDuplicate()` when `type === 'recipe'`
- [x] 8.5 In `RecipeMergePreview` component, show `preview.affected_meal_count` instead of `preview.affected_recipe_items`
- [x] 8.6 Update query invalidation: for recipe merge, invalidate `['recipe-duplicates']` instead of `['ingredient-duplicates']`

## 9. OpenSpec — Task-Korrektur

- [x] 9.1 In `openspec/changes/archive/2026-06-07-data-quality-offensive/tasks.md`, change Task 6.8 from `[x]` to `[ ]`

## 10. Tests — Backend API

- [x] 10.1 Write test for `GET /recipes/merge/preview/` — happy path with two recipes
- [x] 10.2 Write test for preview — 404 on unknown recipe
- [x] 10.3 Write test for `POST /recipes/merge/` — happy path: source is soft-deleted, ContentLink created
- [x] 10.4 Write test for merge — 400 on same source/target
- [x] 10.5 Write test for merge — duplicate merge attempt (already merged)
- [x] 10.6 Write test for `POST /recipes/duplicates/dismiss/` — happy path
- [x] 10.7 Write test for `DELETE /recipes/duplicates/dismiss/` — happy path
- [x] 10.8 Write test for recipe_duplicates — dismissed pairs excluded from results
