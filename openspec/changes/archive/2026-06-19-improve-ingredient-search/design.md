## Context

The ingredient autocomplete in the Food Frontend (`IngredientAutocomplete`) currently uses the paginated list endpoint (`GET /api/ingredients/?name=Salz&page_size=8`) with `icontains` filtering and alphabetical ordering. This means searching "Salz" returns every ingredient containing "salz" sorted by name, with common items like "Salz" buried among partial matches like "Balsamico-Essig". The dropdown shows only `name` + `retail_section_name`.

The project already has a `suggest` endpoint (`GET /api/ingredients/suggest/?q=Salz`) using PostgreSQL `pg_trgm` trigram similarity that ranks by relevance — but it's only used in the `UnknownIngredientDialog` (fallback when nothing is found). The `Recipe` model already has a `usage_count` field maintained by signals on `MealItem` changes, but `Ingredient` has no equivalent.

**Current architecture:**
```
IngredientAutocomplete → GET /api/ingredients/?name=Salz&page_size=8
                          → icontains filter + alphabetical ordering
                          → {items: [{id, name, slug, retail_section}], total, ...}

UnknownIngredientDialog → GET /api/ingredients/suggest/?q=Salz&limit=5
                          → pg_trgm TrigramSimilarity (>0.3 threshold)
                          → [{id, name, slug, similarity, matched_via}]
```

**Affected files:**
- Backend: `backend/supply/services/fuzzy_match.py`, `backend/supply/api/ingredients.py`, `backend/supply/schemas/ingredients.py`, `backend/supply/models/ingredient.py`
- Frontend-Food: `frontend-food/src/components/recipe/IngredientAutocomplete.tsx`, `frontend-food/src/components/recipe/UnknownIngredientDialog.tsx`, Zod schemas

## Goals / Non-Goals

**Goals:**
- Prioritize frequently-used and exact/prefix-matching ingredients in autocomplete results
- Show richer information per result (Nutri-Score, price, usage frequency)
- Increase result limit from 8 to 15
- Add `usage_count` to Ingredient model to track recipe references

**Non-Goals:**
- Full-text search via `search_vector` field (future optimization)
- Embedding-based semantic search (already exists, unused)
- Changing the ingredient list page (`IngredientListPage`) — just the autocomplete
- Modifying the `UnknownIngredientDialog` flow (it continues to work as-is)

## Decisions

### 1. Autocomplete switches to suggest endpoint

**Decision:** Replace the list-API call in `IngredientAutocomplete` with the suggest endpoint.

**Why:** The suggest endpoint already uses `TrigramSimilarity` with relevance ranking. "Salz" gets similarity ~1.0, "Meersalz" gets lower. This gives us the ranking we need without building a new endpoint.

**Alternative considered:** Extend the list endpoint with trigram similarity. Rejected because the list endpoint has pagination, filters, and visibility logic that would complicate ranking. The suggest endpoint is purpose-built.

### 2. Secondary sort by usage_count

**Decision:** When multiple ingredients have the same similarity score, break ties by `usage_count DESC`.

**Why:** "Salz" and "Salzstangen" may have similar trigram scores. Sorting the more frequently-used ingredient first gives users what they want more often.

**Implementation:** Add `usage_count` annotation to the suggest query results using a subquery on `RecipeItem`, then sort by `(-similarity, -usage_count)`.

### 3. usage_count as denormalized field on Ingredient

**Decision:** Add `usage_count = IntegerField(default=0)` to `Ingredient`, updated via Django signals when `RecipeItem` is created/changed/deleted.

**Why:** Matches the existing pattern on `Recipe.usage_count` (maintained by `planner/signals.py`). Denormalized count avoids expensive JOINs at query time. Backfilled once via management command.

**Alternative considered:** Compute on-the-fly with `RecipeItem.objects.filter(portion__ingredient=ing).count()`. Rejected because it's O(n) queries and would slow down the suggest endpoint.

### 4. Extend suggest response schema

**Decision:** Add `nutri_class`, `price_per_kg`, and `usage_count` fields to the suggest endpoint response.

**Why:** The frontend needs these to display Nutri-Score badge, price, and frequency in the dropdown. Currently only `id`, `name`, `slug`, `similarity`, `matched_via` are returned.

**Implementation:** `select_related` isn't needed (fields are on Ingredient directly). Add these fields to the `values()` query and to the response schema.

### 5. Richer dropdown UI

**Decision:** Display `name` (primary), Nutri-Score badge (colored A–E), price per kg, and usage count in each dropdown row.

**Why:** Users can't distinguish "Salz" from "Meersalz" by name alone. The extra metadata helps them select the right ingredient quickly.

**Nutri-Score colooring:** A=green, B=light-green, C=yellow, D=orange, E=red — following existing badge styles in `IngredientCard`.

## Risks / Trade-offs

**[Trigram index performance]** → The suggest query already uses `pg_trgm`. Adding `usage_count` via subquery could slow it down. **Mitigation:** Use a simple `F("usage_count")` annotation from the already-selected Ingredient row — no subquery needed since `usage_count` is a field on the model.

**[usage_count staleness]** → If signals fail or bulk-creates bypass signals, `usage_count` drifts. **Mitigation:** Management command for backfill (like `backfill_recipe_usage_count`). Add periodic consistency check.

**[Increased response size]** → 15 results with 6 fields each vs. 8 results with 4 fields. Still tiny (~2KB max). No concern.

**[Ghost text relies on first result]** → Ghost text currently picks the first `name.startsWith(input)` suggestion. With trigram ordering, this still works — exact prefix matches get similarity ~1.0 and are sorted first.

## Migration Plan

1. Add `usage_count` field to `Ingredient` model with default=0
2. Create Django migration for the new field
3. Run `backfill_ingredient_usage_count` management command to populate counts from existing `RecipeItem` references
4. Add signals on `RecipeItem` post_save/post_delete to maintain the count
5. Extend the suggest endpoint response schema
6. Update `fuzzy_match.py` to include `usage_count`, `nutri_class`, `price_per_kg` and sort by `(-similarity, -usage_count)`
7. Update `IngredientAutocomplete` to call suggest endpoint
8. Update dropdown UI to show Nutri-Score, price, usage count

**Rollback:** Remove `usage_count` field, revert frontend to list-API. The suggest endpoint change is additive (new fields), no breaking change.