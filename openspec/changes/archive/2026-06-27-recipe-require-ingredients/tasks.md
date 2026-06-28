## 1. Backend — API Validation

- [x] 1.1 Add ingredient check to `update_recipe_visibility` in `backend/recipe/api/recipes.py`: block setting `visibility=public` (which triggers `status=submitted`) when `recipe.recipe_items.exists()` is False, with error message "Rezept benötigt mindestens eine Zutat zum Veröffentlichen"
- [x] 1.2 Add ingredient removal guard to `update_recipe` in `backend/recipe/api/recipes.py`: when `recipe_items_data` is an empty list and `recipe.status != "draft"`, reject with HTTP 400 and message "Bei veröffentlichten Rezepten können nicht alle Zutaten entfernt werden"

## 2. Frontend — UX Updates

- [x] 2.1 Update info box on `CreateRecipePage.tsx` (line ~273-285): replace current text with "Zutaten können später im Zutaten-Editor hinzugefügt werden. Zum Veröffentlichen wird mindestens eine Zutat benötigt."
- [x] 2.2 Add ingredient-count check to `RecipeDetailPage.tsx`: conditionally disable the "Veröffentlichen" publish/visibility button when `recipe.recipe_items` is empty and `recipe.status == "draft"`, with tooltip "Erst Zutaten hinzufügen"

## 3. Tests

- [x] 3.1 Write API test for `update_recipe_visibility` blocking publish without ingredients
- [x] 3.2 Write API test for `update_recipe_visibility` succeeding with ingredients
- [x] 3.3 Write API test for `update_recipe` blocking empty ingredient replacement on non-draft recipe
- [x] 3.4 Write API test for `update_recipe` allowing empty ingredient replacement on draft recipe
- [x] 3.5 Write API test that draft recipe creation still works without ingredients
- [x] 3.6 Verify all existing recipe API tests still pass
