## 1. Backend: Weight calculation helper + density support

- [x] 1.1 Extract shared `_calculate_item_weight_g()` helper in `recipe_checks.py`
- [x] 1.2 Add density adjustment for VOLUME-type measuring units using `ingredient.physical_density`
- [x] 1.3 Use the shared helper in both cache path and breakdown API
- [x] 1.4 Add `select_related("portion__measuring_unit")` to the cache query to fix N+1

## 2. Backend: Fix per-serving values in breakdown API

- [x] 2.1 Divide per-item values by `recipe.portions` in `get_recipe_nutrition_breakdown()`
- [x] 2.2 Remove per-item rounding — let frontend format

## 3. Backend: Proper naming in breakfast catalog

- [x] 3.1 Rename `DrinkRecipeOut.cached_energy_kcal` → `cached_energy_total_kcal`
- [x] 3.2 Rename `WarmMealRecipeOut.cached_energy_kcal` → `cached_energy_total_kcal`
- [x] 3.3 Add `cached_weight_g` to both schemas
- [x] 3.4 Update frontend Zod schemas + component references

## 4. Backend: Tests

- [x] 4.1 Run existing tests: 56 passed
- [x] 4.2 `test_density_adjusted_weight_for_volume` — density applied for VOLUME units
- [x] 4.3 `test_weight_with_explicit_weight_g_ignores_density` — explicit weight_g used directly
- [x] 4.4 `test_per_item_values_are_per_serving` — per-item sum matches per_serving_energy_kcal

## 5. Verify

- [x] 5.1 Run full test suite (56 nutrition-related tests pass)
