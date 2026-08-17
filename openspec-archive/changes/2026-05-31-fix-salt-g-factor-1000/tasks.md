## 1. Data Migration: Fix salt_g values

- [x] 1.1 Create Django migration in `supply` app with `RunPython` that divides `salt_g` by 1000 for all Ingredients where `abs(salt_g - sodium_mg * 2.5) < 0.01` and `sodium_mg > 0` and `salt_g > 0`
- [x] 1.2 Add reverse migration that multiplies by 1000 (same condition)
- [x] 1.3 Run migration locally: `uv run python manage.py migrate supply`
- [x] 1.4 Verify fix: query DB to confirm salt values are now reasonable (e.g. Gemüsebrühe ~0.76g, Möhre ~0.22g)

## 2. Code Fix: nutrition_summary scaling

- [x] 2.1 In `planner/api/meal_plan.py` line 546: add `if not mi.recipe: continue` to skip ingredient-only MealItems
- [x] 2.2 In `planner/api/meal_plan.py` line 560: change `scale = (weight_g / 100.0) * mi.factor` to `scale = (weight_g / 100.0) * mi.factor * (norm_portions / (mi.recipe.servings or 1))`

## 3. Recipe Cache Invalidation

- [x] 3.1 In the data migration, after fixing salt_g values, call `recalculate_recipe_cache` for all recipes that have RecipeItems linked to affected ingredients
- [x] 3.2 Verify cached values updated correctly for a sample recipe

## 4. Deploy to Production

- [ ] 4.1 Deploy backend with new migration to Cloud Run
- [ ] 4.2 Verify migration ran on prod DB (check salt values via admin or API)
- [ ] 4.3 Verify nutrition summary shows correct values for existing meal plans
