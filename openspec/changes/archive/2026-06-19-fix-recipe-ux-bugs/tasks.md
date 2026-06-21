## 1. API_BASE_URL in Components

- [x] 1.1 `IngredientAutocomplete.tsx`: Import `API_BASE_URL`, replace hardcoded `/api/ingredients/` URL
- [x] 1.2 `UnknownIngredientDialog.tsx`: Import `API_BASE_URL`, replace hardcoded `/api/ingredients/suggest/` URL
- [x] 1.3 `InlineIngredientEditor.tsx`: Replace hardcoded `/api/ingredients/${slug}/portions/` URL with `API_BASE_URL`

## 2. Number Input String-State Pattern

- [x] 2.1 `MealEventListPage.tsx`: Convert `createPortions` from `number` to `string` state, parse on submit
- [x] 2.2 `SettingsPanel.tsx`: Convert `portions`, `reserve`, `budget` to string state, parse on save
- [x] 2.3 `CreateRecipePage.tsx`: Convert `servings` and `normalizeServings` to string state
- [x] 2.4 `EditRecipePage.tsx`: Convert `servings` to string state, parse on submit
- [x] 2.5 `RecipeDetailPage.tsx`: Convert `servingsMultiplier` to string state

## 3. Portion Dropdown Labels

- [x] 3.1 `InlineIngredientEditor.tsx`: Change `<option>` label to `{p.quantity} {p.measuring_unit_name || p.name}`

## 4. Ingredient Selection with Portion in CreateRecipePage

- [x] 4.1 Add `portion_id` to `IngredientEntry` type, initialize as null
- [x] 4.2 After `addIngredient()`, fetch portions for selected ingredient and show dropdown
- [x] 4.3 Update save handler: filter by `portion_id !== null` (already exists), ensure all manual ingredients have portion set

## 5. Inline Ingredient Creation

- [x] 5.1 `InlineIngredientEditor.tsx`: Import `useCreateIngredient` hook
- [x] 5.2 `InlineIngredientEditor.tsx`: Rewrite `handleAddIngredient` to support `slug: ''` — create ingredient, create default Gramm portion, insert into editItems
- [x] 5.3 `UnknownIngredientDialog.tsx`: Wire `onCreateNew` to trigger the inline creation flow in parent
- [x] 5.4 Remove the `toast.error('Bitte eine bestehende Zutat auswählen')` fallback

## 6. Servings Display Scaling in Edit Mode

- [x] 6.1 `InlineIngredientEditor.tsx`: Modify `normalizeItems()` — display quantities as `item.quantity * servings` instead of dividing to per-1-serving
- [x] 6.2 `InlineIngredientEditor.tsx`: Modify `handleSave()` — divide quantities by `servings` before sending, remove `updateRecipe.mutateAsync({ servings: 1 })`
- [x] 6.3 `RecipeDetailPage.tsx`: Pass correct `servings` prop to `InlineIngredientEditor` (use current display servings, not always 1)

## 7. Verification

- [x] 7.1 Run `npm run lint` in `frontend-food/` and fix any issues
- [x] 7.2 Run `npm run build` in `frontend-food/` (includes `tsc -b`) and fix type errors
- [x] 7.3 Manual test: Create Essensplan — clear person count, verify it stays empty, verify submit with empty shows error
- [x] 7.4 Manual test: Create Rezept — add ingredient, verify portion dropdown appears, verify save works
- [x] 7.5 Manual test: Edit Rezept — verify servings scaling displays correctly, verify save persists per-1-portion
- [x] 7.6 Manual test: Inline Editor — type unknown ingredient, click "Neu anlegen", verify ingredient created and inserted
- [x] 7.7 Manual test: Verify no duplicate units in portion dropdown
