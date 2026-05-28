## Why

The `import_cooklang` management command creates RecipeItems without resolving ingredients that don't already exist in the database. This causes three visible bugs: (1) ingredients show "0 g" because `smartRound()` rounds small gram values to 0, (2) non-weight units like "Stück" or "EL" are displayed as grams because the frontend ignores `measuring_unit`, and (3) many ingredients are not clickable because no `Ingredient` record is linked. Over half of all imported RecipeItems are affected.

## What Changes

- **`import_cooklang` command**: Auto-create missing `Ingredient` records with a default "1 g" `Portion` when an ingredient name is not found in the database. Link the new ingredient to the RecipeItem.
- **Frontend `IngredientList.tsx`**: Display quantity + unit name directly when the measuring unit is not a weight unit (g/kg) or volume unit (ml/l), instead of converting everything through `formatQuantity()`.
- **Frontend `smartRound()`**: Fix rounding so values < 5 are not rounded to 0 (return actual value or minimum 1 for values > 0).
- **Re-import**: Delete existing Cooklang-imported recipes and re-run the import with the fixed command.

## Capabilities

### New Capabilities
- `cooklang-ingredient-autocreate`: Auto-creation of Ingredient + Portion records during Cooklang import when ingredient is not found in DB

### Modified Capabilities

## Impact

- **Backend**: `recipe/management/commands/import_cooklang.py`, `supply.Ingredient` model (new records created), `supply.Portion` model (new records created)
- **Frontend**: `src/lib/unitConversion.ts` (`smartRound` function), `src/components/supply/IngredientList.tsx` (display logic)
- **Schemas**: No schema changes needed (existing `RecipeItemSchema` already supports all fields)
- **Migrations**: None needed (no model changes, only new data records)
