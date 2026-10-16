## Why

Recipes often state liquids in volume (e.g. "1300 ml Rapsöl"), but the ingredient quantity dialog only offers portions (e.g. "1 Portion = 10 g") or grams. Users have to convert by hand (1300 ml ≈ 119,6 × 10 g ≈ 1,2 kg), which is error-prone and confusing.

## What Changes

- The ingredient quantity dialog accepts a volume entry in ml for liquid ingredients whose density is known.
- The unit picker gets a "Milliliter" section for liquid ingredients with density.
- The dialog shows the conversion line, e.g. "1300 ml × 0,92 g/ml = 1,2 kg".
- Both callers of the dialog pass the ingredient's density and viscosity.

## Capabilities

### New Capabilities

- `liquid-ml-quantity`: Entering liquid ingredient quantities in ml, converted to grams via the ingredient's density.

### Modified Capabilities

None. Existing portion and standard-measure behavior is unchanged.

## Impact

- `frontend-food/src/components/recipe/IngredientQuantityDialog.tsx`: new props (density, viscosity), ml handling, conversion line.
- `frontend-food/src/components/recipe/PortionPicker.tsx`: new "Milliliter" section.
- `frontend-food/src/components/recipe/IngredientDetailSearchDialog.tsx` and `RecipeIngredientReviewStep.tsx`: pass density and viscosity.
- No backend, API, or schema change. Data comes from the existing `physical_density` and `physical_viscosity` fields.
