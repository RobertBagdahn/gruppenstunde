## 1. Fix Frontend display logic

- [x] 1.1 Fix `smartRound()` in `frontend/src/lib/unitConversion.ts`: values < 5 should use `Math.round(value)` instead of rounding to nearest 5
- [x] 1.2 Update `IngredientList.tsx`: detect non-weight/volume measuring units and display `{quantity} {measuring_unit_name}` directly instead of routing through `formatQuantity(weightG)`
- [x] 1.3 Define weight/volume unit list (g, kg, gramm, kilogramm, ml, l, milliliter, liter) for the branch condition

## 2. Fix import_cooklang command

- [x] 2.1 Add auto-creation of `Ingredient` (status=`user_content`, slug from name) when ingredient name not found in DB
- [x] 2.2 Create default Portion (`measuring_unit=Gramm`, `weight_g=1.0`, `quantity=1.0`) for each newly created Ingredient
- [x] 2.3 Always set `ingredient` on RecipeItem (never None) — use the newly created or existing Ingredient
- [x] 2.4 Log created ingredients count in command output

## 3. Re-import Cooklang recipes

- [x] 3.1 Delete existing Cooklang-imported recipes (filter by `summary__contains="Cooklang"`)
- [x] 3.2 Run `uv run python manage.py import_cooklang "/Users/robertbagdahn/Downloads/Cooklang Rezepte"`
- [x] 3.3 Verify: zero RecipeItems with `ingredient=None` for Cooklang recipes
- [x] 3.4 Verify: UI displays quantities correctly (no "0 g" for Stück-based items)
