## 1. Backend: API Endpoint + Schema

- [x] 1.1 Add new endpoint `GET /{slug}/recipes/` in `backend/supply/api/ingredients.py` — query approved visible recipes via `Recipe.objects.filter(recipe_items__portion__ingredient__slug=slug, status="approved").distinct()`, apply visibility filtering (Staff: all, else system+public+own like `_get_visible_recipes_qs()`), paginated with standard `page`/`page_size`
- [x] 1.2 Add `PaginatedRecipeSimilarOut` schema in `backend/recipe/schemas/recipes.py` — wraps `list[RecipeSimilarOut]` + `total`, `page`, `page_size`, `total_pages`. (In recipe.schemas statt supply.schemas wg. circular import)
- [x] 1.3 Run `uv run python manage.py check` to verify no import/syntax errors

## 2. Frontend: Zod Schema + API Hook

- [x] 2.1 Add `PaginatedRecipeSimilarSchema` (Zod) in `frontend-food/src/schemas/recipe.ts` — wraps `z.array(RecipeSimilarSchema)` + `total`, `page`, `page_size`, `total_pages`. 1:1 match zum Pydantic-Schema
- [x] 2.2 Add `useRecipesByIngredient(slug, { page?, page_size? })` Query in `frontend-food/src/api/supplies.ts` — calls `GET /api/ingredients/{slug}/recipes/`, validates with `PaginatedRecipeSimilarSchema`, query key `['ingredient-recipes', slug, page]`
- [x] 2.3 Export hook and type from the api module

## 3. Frontend: IngredientDetailPage Section

- [x] 3.1 Add recipes section below Aliase in `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx` — import `useRecipesByIngredient`, render compact recipe grid (2 cols mobile, 3 cols desktop) with image, title, difficulty (Lucide `<ChefHat />`), execution time (Lucide `<Clock />`), clicking navigates to `/recipes/{slug}`
- [x] 3.2 Implement empty state: show „Noch kein Rezept mit dieser Zutat." with button „Rezept mit {name} erstellen" (Lucide `<Plus />`) that navigates to `/recipes/new?ingredient={slug}`
- [x] 3.3 Handle loading state (skeleton) and error state

## 4. Frontend: Pre-Fill in CreateRecipePage

- [x] 4.1 Add `useSearchParams()` read in `frontend-food/src/pages/recipes/CreateRecipePage.tsx` — if `?ingredient={slug}` present, fetch ingredient via `useIngredient(slug)`, resolve default portion (`is_default=true`, fallback erste Portion), set `portion_id`, `ingredient_id`, `ingredient_slug` in IngredientEntry. **CRITICAL**: `portion_id` MUSS gesetzt sein, da `handleSave` null-portions filtert
- [x] 4.2 Handle edge cases: non-existent slug (silent ignore), ingredient has no portions (silent ignore), ingredient already pre-added by URL import (avoid duplicate via `useRef` guard)

## 5. Qualitätssicherung

- [x] 5.1 TypeScript check: `npx tsc --noEmit` in `frontend-food/` — no new errors (existing errors are pre-existing)
- [x] 5.2 Backend check: `uv run python manage.py check` — System check identified no issues
- [ ] 5.3 Manuell testen: Ingredient-Detailseite mit/ohne Rezepten, CTA-Klick, Pre-Fill mit portion_id auf Create-Seite, Edge-Case-Prüfung der Visibility-Filter
