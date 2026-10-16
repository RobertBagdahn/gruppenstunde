## 1. Data plumbing

- [x] 1.1 Extend the ingredient prop type of `IngredientQuantityDialog` with optional `physical_density` and `physical_viscosity`
- [x] 1.2 Pass density and viscosity from `IngredientDetailSearchDialog.tsx`
- [x] 1.3 Pass density and viscosity from `RecipeIngredientReviewStep.tsx`

## 2. Picker

- [x] 2.1 Add a "Milliliter" section to `PortionPicker.tsx`, shown only for liquid viscosity with density > 0
- [x] 2.2 Wire the section to a selection callback in the dialog

## 3. Dialog logic

- [x] 3.1 Handle ml quantities in `IngredientQuantityDialog.tsx`: convert to grams with density on confirm
- [x] 3.2 Show the conversion line "X ml × D g/ml = Y" with German number formatting

## 4. Tests

- [x] 4.1 Unit test: ml to gram conversion (1300 ml × 0.92 = 1196 g)
- [x] 4.2 Unit test: section hidden for solids and for liquids without density
- [x] 4.3 Run the frontend-food test suite and type check
