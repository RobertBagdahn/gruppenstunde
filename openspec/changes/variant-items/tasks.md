## 1. Backend Model

- [x] 1.1 Add `active_recipe_item_ids = JSONField(default=list)` to `MealItem`
- [x] 1.2 Add `variant_group_id = UUIDField(null=True)` to `MealItem`
- [x] 1.3 Remove `unique_recipe_per_meal` constraint from `MealItem.Meta.constraints`
- [x] 1.4 Run `makemigrations` to generate migration for field additions + constraint removal
- [x] 1.5 Export `MealItemSplit` removal via a new migration (CreateModel reverse)
- [x] 1.6 Update `planner/models/__init__.py` — remove `MealItemSplit` from imports

## 2. Backend Schemas (Pydantic)

- [x] 2.1 Add `active_recipe_item_ids: list[int]` to `MealItemOut`
- [x] 2.2 Add `variant_group_id: str | None` to `MealItemOut`
- [x] 2.3 Create `MealItemVariantIn` + `MealItemBatchIn` schemas
- [x] 2.4 Remove `MealItemSplitIn` and `MealItemSplitOut`
- [x] 2.5 Confirm `factor: float` already exists on `MealItemUpdateIn`
- [x] 2.6 Update `planner/schemas/__init__.py`

## 3. Backend Services

- [x] 3.1 Create `planner/services/variant_service.py` with:
  - `compute_variant_energy(meal_item)` — delta-based energy from active_recipe_item_ids
  - `compute_variant_cost(meal_item)` — delta-based cost from active_recipe_item_ids
  - `compute_variant_contributions(meal_plan)` — per-RecipeItem contributions for shopping
- [x] 3.2 Update `MealItemOut.energy_kcal` resolver in `schemas/meal_plan.py` to use `variant_service.compute_variant_energy`
- [x] 3.3 Update `MealItemOut.cost_eur` resolver in `schemas/meal_plan.py` to use `variant_service.compute_variant_cost`

## 4. Backend API

- [x] 4.1 Create `POST /{meal_plan_id}/meals/{meal_id}/items/batch/` endpoint
- [x] 4.2 Confirm existing `PATCH` already handles `factor` on `MealItemUpdateIn`
- [x] 4.3 Remove `GET /{meal_plan_id}/meal-items/{item_id}/splits/`
- [x] 4.4 Remove `PUT /{meal_plan_id}/meal-items/{item_id}/splits/` + `_validate_split_shares`
- [x] 4.5 Remove `DELETE /{meal_plan_id}/meal-items/{item_id}/splits/`
- [x] 4.6 Update nutrition_summary to use active_recipe_item_ids check instead of get_included_fractions
- [x] 4.7 Update cost_summary to use active_recipe_item_ids check instead of get_included_fractions
- [x] 4.8 Add `prefetch_related("meals__items__recipe__recipe_items__portion__ingredient")`

## 5. Backend Cross-Cutting Updates

- [x] 5.1 Update `supply/services/shopping_service.py` — replace `get_included_fractions` call with active_recipe_item_ids check
- [x] 5.2 Update `planner/services/pdf_export.py` — replace `item.splits.all()` + split rendering with simplified single-item rendering
- [x] 5.3 Update `recipe/api/items.py` delete-protection: `_recipe_item_has_active_variants` replaces `_recipe_item_has_active_splits`
- [x] 5.4 Update `recipe/api/recipes.py` delete-protection: `MealItem.objects.filter(recipe=recipe).exists()` replaces `MealItemSplit` check
- [x] 5.5 Remove `split_service.py` entirely

## 6. Frontend Schemas (Zod)

- [x] 6.1 Add `active_recipe_item_ids: z.array(z.number())` to `MealItemSchema`
- [x] 6.2 Add `variant_group_id: z.string().nullable()` to `MealItemSchema`
- [x] 6.3 Remove `MealItemSplitSchema`, `MealItemSplitInSchema`, `MealItemSplitBulkSetSchema`
- [x] 6.4 Remove `MealItemSplitIn`, `MealItemSplit` type exports

## 7. Frontend API Hooks

- [x] 7.1 Create `useBatchCreateMealItems` hook for `POST .../items/batch/`
- [x] 7.2 Create `useUpdateMealItemFactor` hook for `PATCH .../items/{id}/` with factor (removed, `useUpdateMealItem` already handles this)
- [x] 7.3 Remove `useMealItemSplits` hook
- [x] 7.4 Remove `useSetMealItemSplits` hook
- [x] 7.5 Remove `useDeleteMealItemSplits` hook
- [x] 7.6 Remove `validateSplitShares` helper

## 8. Frontend VariantSliderDialog

- [x] 8.1 Create `VariantSliderDialog` component:
  - Receives `recipe_id`, `effectivePortions`, `mealPlanId`, `mealId`
  - Loads `RecipeItem[]` via existing `useRecipeItems`
  - Generates combinatorial variants (Kreuzprodukt aller Austausch-Gruppen + Optionals)
  - Each variant has a slider (0–effectivePortions), Slider-Summe = effectivePortions
  - Largest-remainder rounding on slider changes
  - "Ohne"-Variante bei Optionals (negative recipeItemId als Platzhalter)
  - Variant-Name = "mit/ohne X + Y + Z" (Kombination der ausgewählten Optionen)
- [x] 8.2 On save: filter variants with portions > 0 → compute factor = portions/effectivePortions → call `useBatchCreateMealItems`
- [x] 8.3 Remove old `SplitConfigDialog.tsx`

## 9. Frontend Display & Edit

- [x] 9.1 Group MealItems by `variant_group_id` in `DayPlanView` and `TableView`
  - Show recipe header (full width), indent variant children with display_name
  - Items without `variant_group_id` displayed normally
- [x] 9.2 Use existing `FactorInput` component for inline factor editing
- [x] 9.3 Filter items with `factor < 0.01` from display (client-side)
- [x] 9.4 Update `MealEventDetailPage.tsx`:
  - Replace `SplitConfigDialog` import with `VariantSliderDialog`
  - Update `handleAddRecipe` to open `VariantSliderDialog` instead

## 10. Tests

- [x] 10.1 Rewrite `recipe/tests/test_exchanges_and_splits.py` → `test_exchanges_and_variants.py`:
  - Removed all MealItemSplit-based tests
  - Added tests for batch endpoint (happy path + validation)
  - Added tests for variant_service compute functions
  - Added tests for delete protection with active_recipe_item_ids
  - Added tests for shopping list with new variant system
  - Added tests for energy/cost resolvers with variants
- [x] 10.2 Run full test suite: 320 passed, 9 pre-existing errors (visibility/AI tests)

## 11. Cleanup

- [ ] 11.1 Update `openspec/specs/meal-item-splits/spec.md` to `## REMOVED Requirements`
- [ ] 11.2 Update `openspec/specs/recipe-exchanges/spec.md` with `## MODIFIED Requirements` for delete-protection
- [ ] 11.3 Update `openspec/specs/recipe-optional-items/spec.md` with `## MODIFIED Requirements` for delete-protection
- [x] 11.4 Run `makemigrations --check` — no pending migrations
