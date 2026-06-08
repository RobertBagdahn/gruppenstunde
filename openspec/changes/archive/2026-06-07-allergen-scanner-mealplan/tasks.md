## 1. Backend: MealPlan Allergen Tags (Model, Schema, API, Migration)

- [x] 1.1 Add `allergen_tags` M2M field to MealPlan model (planner/models/meal_plan.py)
- [x] 1.2 Create and run migration: `uv run python manage.py makemigrations planner && uv run python manage.py migrate`
- [x] 1.3 Add `allergen_tag_ids` to MealPlanCreateIn/UpdateIn schemas (planner/schemas/meal_plan.py)
- [x] 1.4 Add `allergen_tag_ids` and `allergen_tags` to MealPlanOut/MealPlanDetailOut schemas
- [x] 1.5 Update create_meal_plan/update_meal_plan endpoints to handle allergen_tag_ids
- [x] 1.6 Add validation: only allow NutritionalTag with is_dangerous=True as allergen tags
- [x] 1.7 Update Django Admin for MealPlan: filter_horizontal for allergen_tags with limit_choices_to
- [x] 1.8 Write tests: create/update MealPlan with allergen tags, validation, permissions

## 2. Backend: Recipe Allergen Sync Service & Signals

- [x] 2.1 Create `sync_recipe_allergen_tags(recipe)` in recipe/services/recipe_checks.py
- [x] 2.2 Add post_save signal on RecipeItem → trigger sync
- [x] 2.3 Add post_delete signal on RecipeItem → trigger sync
- [x] 2.4 Add post_save signal on Recipe → trigger sync (idempotent)
- [x] 2.5 Ensure sync only affects is_dangerous tags (preserve non-dangerous)
- [x] 2.6 Create management command `sync_recipe_allergen_tags` (recipe/management/commands/)
- [x] 2.7 Write tests: sync on RecipeItem CRUD, bulk sync command, edge cases (no items, removed ingredients)

## 3. Backend: Allergen Scanner Endpoint

- [x] 3.1 Add `AllergenScanOut`, `AllergenViolationOut`, `AllergenScanSummaryOut` schemas (planner/schemas/meal_plan.py)
- [x] 3.2 Implement GET /api/meal-plans/{id}/allergen-scan/ endpoint (planner/api/meal_plan.py)
- [x] 3.3 Optimize queryset with prefetch_related for meals__items__recipe__nutritional_tags
- [x] 3.4 Return violations grouped by meal-recipe-allergen with source="recipe_tag"
- [x] 3.5 Include summary: total_violations, affected_meals, unique_allergens
- [x] 3.6 Write tests: scanner with violations, without violations, permissions, performance

## 4. Backend: Recipe Search Allergen Exclusion (Default Filter)

- [x] 4.1 Modify search_recipes endpoint to accept optional exclude_nutritional_tag_ids param
- [x] 4.2 When exclude_nutritional_tag_ids provided, filter: exclude(nutritional_tags__in=ids)
- [x] 4.3 Update RecipeSearchResultSchema if needed (no changes expected)
- [x] 4.4 Write tests: search with exclusion filter, without filter

## 5. Frontend: Zod Schemas & API Hooks

- [x] 5.1 Extend MealPlanSchema/MealPlanDetailSchema with allergen_tag_ids, allergen_tags (frontend-food/src/schemas/mealPlan.ts)
- [x] 5.2 Add AllergenScanResponseSchema, AllergenViolationSchema, AllergenScanSummarySchema
- [x] 5.3 Add useAllergenScan(mealPlanId) hook (frontend-food/src/api/mealPlans.ts)
- [x] 5.4 Update useMealPlan, useCreateMealPlan, useUpdateMealPlan to handle allergen_tag_ids
- [x] 5.5 Update useRecipeSearch to support exclude_nutritional_tag_ids parameter

## 6. Frontend: AllergenWarningBadge Component

- [x] 6.1 Create AllergenWarningBadge.tsx (frontend-food/src/components/shared/)
- [x] 6.2 Props: allergenTags: NutritionalTag[] (id, name)
- [x] 6.3 Renders AlertCircle icon (lucide-react) in red, tooltip with "Enthält: X, Y"
- [x] 6.4 Renders null if allergenTags empty
- [x] 6.5 Add to components export barrel

## 7. Frontend: Allergie-Scanner Tab

- [x] 7.1 Create AllergenScannerTab.tsx (frontend-food/src/components/planning/)
- [x] 7.2 Fetches scanner data via useAllergenScan on mount
- [x] 7.3 Accordion per allergen: "Erdnüsse (3 Verstöße)"
- [x] 7.4 Expandable list: "15.07. Mittagessen – Satay-Sauce" with recipe link
- [x] 7.5 Empty state: "Keine Allergenverstöße gefunden ✓"
- [x] 7.6 Integrate into MealEventDetailPage.tsx: new tab "Allergie-Scanner" with AlertTriangle icon
- [x] 7.7 Tab only renders when mealPlan.allergen_tag_ids.length > 0

## 8. Frontend: Warning Integration in Existing Views

- [x] 8.1 DayPlanView.tsx: Show AllergenWarningBadge on meal items with violating recipes
- [x] 8.2 TableView.tsx: Show AllergenWarningBadge in recipe column
- [x] 8.3 NutritionView.tsx: Warning banner at top if violations exist, link to Scanner tab
- [x] 8.4 CostDashboard.tsx: Warning banner if violations exist
- [x] 8.5 ShoppingView.tsx: Red left border on rows from violating recipes, tooltip
- [x] 8.6 MealEventDetailPage.tsx: Pass mealPlan.allergen_tag_ids to child views

## 9. Frontend: RecipeSearchDialog Allergen Filter & Badges

- [x] 9.1 RecipeSearchDialog.tsx: Accept mealPlanAllergenTagIds prop
- [x] 9.2 On open: pass allergen IDs as exclude_nutritional_tag_ids to useRecipeSearch
- [x] 9.3 Add "Allergene trotzdem anzeigen" toggle to disable exclusion
- [x] 9.4 Show AllergenWarningBadge on each recipe result that has matching allergens
- [x] 9.5 MealEventDetailPage.tsx: Pass mealPlan.allergen_tag_ids to RecipeSearchDialog

## 10. Frontend: Settings Panel Allergen Tag Management

- [x] 10.1 SettingsPanel.tsx: Add allergen tag multi-select (reuse NutritionalTagMultiSelect)
- [x] 10.2 Filter to only is_dangerous tags
- [x] 10.3 Save via useUpdateMealPlan with allergen_tag_ids

## 11. Testing & Polish

- [x] 11.1 Backend tests: all new endpoints, signals, sync command
- [x] 11.2 Frontend tests: components (AllergenWarningBadge, AllergenScannerTab), hooks
- [x] 11.3 Integration test: Create MealPlan with allergens → add violating recipe → scanner shows violation
- [x] 11.4 Run backfill command: `uv run python manage.py sync_recipe_allergen_tags`
- [x] 11.5 Verify mobile UI (320px) for all new components
- [x] 11.6 Check TypeScript strict mode, no `any`, all schemas sync