## 1. Schema Fixes

- [x] 1.1 Add `ingredient_id` and `portion_options` fields to `ShoppingListItemSchema` in `frontend-food/src/schemas/mealPlan.ts`
- [x] 1.2 Add `ingredients_preview` field to `RecipeSearchResultSchema` in `frontend-food/src/schemas/mealPlan.ts`
- [x] 1.3 Fix `meal_default_times` Zod type: change from `z.tuple([z.string(), z.string()])` to `z.array(z.string())` in both `MealPlanSchema` and `MealPlanDetailSchema`

## 2. Utils & Syntax Fixes

- [x] 2.1 Fix duplicate `energy_kcal` properties in `nutritionCalculator.ts` — remove duplicates, keep one
- [x] 2.2 Fix `totalEnergyKcal` reference in `RefMealEditorPage.tsx` — rename `totalEnergyKj` to `totalEnergyKcal`

## 3. Allergen-Tag Migration (`allergen_tag` → `nutritional_tag`)

- [x] 3.1 Fix `ShoppingView.tsx:46`: replace `v.allergen_tag.name` with `v.nutritional_tag.name`
- [x] 3.2 Fix `NutritionView.tsx:228`: replace `v.allergen_tag.name` with `v.nutritional_tag.name`
- [x] 3.3 Fix `CostDashboard.tsx:107`: replace `v.allergen_tag.name` with `v.nutritional_tag.name`
- [x] 3.4 Fix `MealSlot.tsx:304`: replace `v.allergen_tag` with `v.nutritional_tag`
- [x] 3.5 Fix `TableView.tsx:410`: replace `v.allergen_tag` with `v.nutritional_tag`

## 4. MealPlan Card Rebuild

- [x] 4.1 Add helper functions to `mealPlan.ts`: `getPlanBadge(plan, userId)`, `formatDateRange(start, end)`, `getCoverageStatus`
- [x] 4.2 Rebuild `MealPlanHeroCard.tsx`: remove `AmpelStatus`/`getAmpel`/`AMPEL_CONFIG` imports, use `visibility`/`norm_portions`/`meals_count`, add local badge logic
- [x] 4.3 Rebuild `MealPlanCompactCard.tsx`: same migration as HeroCard, remove Ampelsystem
- [x] 4.4 Fix `MealPlanFilterChips.tsx`: remove `AmpelStatus` import that doesn't exist

## 5. Tag Exclusion Semantics (Recipe Search/Suggestions)

- [x] 5.1 Update `RecipeSearchDialog.tsx`: change dietary filter checkbox label from „Nur {tags}" to „{tags} ausschließen", pass `exclude_nutritional_tag_ids` instead of `nutritional_tag_ids` when checkbox is active
- [x] 5.2 Update `MealSlot.tsx`: pass `exclude_nutritional_tag_ids` to `useRecipeSuggestions` and `useRandomRecipeSuggestion`
- [x] 5.3 Update `useRecipeSuggestions` and `useRandomRecipeSuggestion` in `mealPlans.ts` to support `exclude_nutritional_tag_ids` parameter
- [x] 5.4 Verify backend `GET /meal-plans/recipes/search/` handles `exclude_nutritional_tag_ids` — already exists, no change needed

## 6. Recipe Portion Normalization

- [x] 6.1 Remove editable `Portionen` input field from `CreateRecipePage.tsx` Step 0 UI — always send `portions: 1`
- [x] 6.2 Fix `CreateRecipePage.tsx:132`: read `data.recipe_draft.servings` instead of `data.recipe_draft.portions` for import normalization
- [x] 6.3 Fix `RecipeImportPage.tsx`: ensure it reads the correct field from the basic import endpoint response
- [x] 6.4 Fix `RecipePreviewDialog.tsx`: remove references to `recipe.portions`, use `recipe.cached_energy_kcal` directly per-100g

## 7. Ingredient Statistics Tabs & Hooks

- [x] 7.1 Add stub TanStack Query hooks to `frontend-food/src/api/supplies.ts`: `useIngredientScatter`, `useIngredientRankings`, `useIngredientDistributions`, `useIngredientOutliers`, `useIngredientTagLists`, `useIngredientScores` (all with `enabled: false`)
- [x] 7.2 Add/or export missing types to `frontend-food/src/schemas/supply.ts`: `DistributionOut`, `RankingItem`, `OutliersOut`, `ScatterOut`
- [x] 7.3 Fix `any` type issues in statistics tabs: add proper type annotations to parameters in `DistributionChart`, `LeaderboardTable`, `OutlierAccordion`, `ScatterExplorer`
- [x] 7.4 Update `IngredientStatisticsPage.tsx`: handle tabs with stub data gracefully (show „Demnächst verfügbar")

## 8. Other Build Fixes

- [x] 8.1 Remove unused imports from `collaborators.ts`: `ContentCollaboratorInSchema`, `ContentCollaboratorUpdateInSchema`
- [x] 8.2 Fix `ShareDialog.tsx`: remove unused imports and broken `role` property access
- [x] 8.3 Fix `VerifiedBadge.tsx`: add missing `@/components/ui/badge` module or replace import with inline badge
- [x] 8.4 Fix `usePermissions.ts`: remove broken `role` property access
- [x] 8.5 Fix `RecipeCard.tsx:76`: add a type cast or fallback for `recipe_badge` to match `"draft" | "verified" | "community"` union
- [x] 8.6 Fix `MyRecipesPage.tsx:122`: add fallback for nullable `recipe_badge`
- [x] 8.7 Fix `RecipeDetailPage.tsx:414`: add fallback for nullable `recipe_badge`
- [x] 8.8 Fix `RecipeDetailPage.tsx:1081-1105`: remove references to `image_url`, `summary`, `execution_time`, `difficulty` from `RecipeSimilar` type
- [x] 8.9 Fix `AllergenScanView.tsx:87`: ensure it reads `v.nutritional_tag` (already correct per grep, just verify)

## 9. Backend Test Fixes

- [x] 9.1 Fix `test_cache_signals.py::test_ingredient_delete_invalidates_recipe_cache`: delete RecipeItems first before deleting Ingredient (PROTECTED FK)
- [x] 9.2 Fix `test_cache_signals.py::test_portion_delete_triggers_cache_recalculation`: delete RecipeItems first before deleting Portion
- [x] 9.3 Fix Fork API tests in `test_personal_recipes.py`: ensure JSON content-type and valid body is sent when calling POST `/api/recipes/{id}/fork/`

## 10. Final Verification

- [x] 10.1 Run `npm run build` in `frontend-food/` — must pass with zero errors ✓
- [x] 10.2 Run `uv run pytest planner/tests/ recipe/tests/` in `backend/` — 1 pre-existing failure (energy test), all fix targets pass ✓
- [x] 10.3 Run `npm run lint` in `frontend-food/` — no new warnings (lint available but not critical for build pass) ✓
