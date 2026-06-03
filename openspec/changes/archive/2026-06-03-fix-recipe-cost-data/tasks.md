## 1. Backend: Recipe Data Validation Command

- [x] 1.1 Create management command `validate_recipe_data` in `backend/recipe/management/commands/`
- [x] 1.2 Implement detection heuristics: flag recipes where `servings=1` and any ingredient has `quantity * portion.weight_g > 5000g`
- [x] 1.3 Implement `--fix` mode: estimate correct `servings` from total recipe weight (assume ~500-800g per person per meal)
- [x] 1.4 Add logging of all changes (recipe ID, field, old → new value)
- [x] 1.5 Run command locally in dry-run mode, review findings
- [x] 1.6 Run command locally with `--fix`, verify Kartoffelsuppe and other recipes are corrected

## 2. Backend: Ingredient Price Estimation

- [x] 2.1 Review existing `estimate_ingredient_prices` command, check which ingredients used in MealPlan recipes still lack `price_per_kg`
- [x] 2.2 Extend or run `estimate_ingredient_prices` to cover all ingredients referenced by RecipeItems in active meal plans
- [x] 2.3 Run locally and verify price coverage improves (all meal plan ingredients already have prices)

## 3. Frontend: Cost Dashboard UX

- [x] 3.1 In `CostDashboard.tsx`: replace "–" with "Keine Preise" (muted gray text) for recipes with zero priced ingredients
- [x] 3.2 Add price coverage indicator to summary section ("X von Y Zutaten mit Preis")
- [x] 3.3 In daily cost table: show "–" instead of "0,00 €" when a meal has no priced ingredients (to avoid implying free)
- [x] 3.4 For partial coverage recipes: show cost with "~" prefix or warning icon

## 4. Production Deployment

- [ ] 4.1 Run `validate_recipe_data --fix` on production database via Cloud Run Job
- [ ] 4.2 Run `estimate_ingredient_prices` on production database
- [ ] 4.3 Verify cost dashboard shows improved data on production
