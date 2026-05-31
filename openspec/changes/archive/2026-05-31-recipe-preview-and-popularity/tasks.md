## 1. Backend: Recipe usage_count Feld

- [x] 1.1 Add `usage_count = IntegerField(default=0, db_index=True)` to Recipe model
- [x] 1.2 Create and run migration (`uv run python manage.py makemigrations recipe`)
- [x] 1.3 Add Django signals on MealItem `post_save`/`post_delete` to atomically update `usage_count` (use `F('usage_count') + 1` / recount on delete)
- [x] 1.4 Create management command `backfill_recipe_usage_count` that sets usage_count from actual MealItem counts
- [ ] 1.5 Run backfill command (run manually on production)

## 2. Backend: Popular Recipes API

- [x] 2.1 Create Pydantic schema `RecipePopularItemOut` (id, title, recipe_type, image, usage_count) and `RecipePopularOut` (personal: list, community: list)
- [x] 2.2 Implement `GET /api/meal-plans/recipes/popular` endpoint with `meal_type` (optional) and `limit` (default=8) query params
- [x] 2.3 Community query: `Recipe.objects.order_by('-usage_count')[:limit]`, filtered by recipe_type mapping if meal_type provided
- [x] 2.4 Personal query: Aggregate MealItems by recipe for current user, optional meal_type filter
- [x] 2.5 Handle anonymous users (empty personal list)

## 3. Backend: Extend Recipe Search Response

- [x] 3.1 Extend `RecipeSearchResultOut` schema with: image, servings, cached_energy_kj, cached_protein_g, cached_fat_g, cached_carbohydrate_g, cached_price_total, cached_nutri_class, nutritional_tags, usage_count, description (truncated 200 chars), ingredients_preview (list[str])
- [x] 3.2 Update search query to prefetch RecipeItems (first 8 by sort_order) and nutritional_tags
- [x] 3.3 Populate `ingredients_preview` from prefetched RecipeItems → ingredient.name

## 4. Frontend: Zod Schemas

- [x] 4.1 Add/update Zod schema for popular recipes response (RecipePopularItemOut, RecipePopularOut)
- [x] 4.2 Extend recipe search result Zod schema with all new preview fields

## 5. Frontend: Popular Recipes Section

- [x] 5.1 Create TanStack Query hook `usePopularRecipes({ mealType, limit })` calling `/api/meal-plans/recipes/popular`
- [x] 5.2 Add "Beliebteste" section in RecipeSearchDialog showing personal + community tabs/columns when search query is empty
- [x] 5.3 Hide "Beliebteste" section when user types ≥2 chars, show again when cleared

## 6. Frontend: RecipePreviewDialog

- [x] 6.1 Create `RecipePreviewDialog` component with props: recipe data (from search result), open, onOpenChange, onConfirm
- [x] 6.2 Layout: Image (full-width, max 200px), title, type + servings, nutrition grid (kJ, P, F, KH per portion), price/portion, Nutri-Score badge, nutritional_tags badges, ingredients_preview list, description
- [x] 6.3 "Hinzufügen" button calls onConfirm; "Abbrechen" closes preview and returns to search
- [x] 6.4 Gracefully hide fields that are null/missing

## 7. Frontend: Integration & Toast

- [x] 7.1 Change RecipeSearchDialog: clicking a recipe opens RecipePreviewDialog instead of immediately adding
- [x] 7.2 On confirm from preview: call existing add-recipe mutation, close both dialogs
- [x] 7.3 Show toast "✓ {Rezeptname} hinzugefügt" after successful addition (use existing toast system or add sonner/react-hot-toast)
- [x] 7.4 Popular recipes section items also open the preview dialog on click

## 8. Testing

- [x] 8.1 Backend: Test signal updates usage_count on MealItem create/delete
- [x] 8.2 Backend: Test popular endpoint returns correct personal/community split
- [x] 8.3 Backend: Test search response includes new fields
- [ ] 8.4 Manual: Verify mobile UX (dialog stacking, scroll, touch targets)
