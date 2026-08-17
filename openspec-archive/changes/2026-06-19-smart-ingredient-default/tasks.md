## 1. Shared Utility

- [x] 1.1 Create `frontend-food/src/lib/portionDefaults.ts` with `selectSmartDefaultPortion()` function
- [x] 1.2 Implement filter logic: skip portions with `weight_g == null` or `weight_g == 1`
- [x] 1.3 Implement sort: `priority` DESC, then `rank` ASC
- [x] 1.4 Implement fallback: Gramm portion with `quantity = 100` when no meaningful portion exists

## 2. CreateRecipePage

- [x] 2.1 Include `priority` in `addIngredient` portion mapping (line 219-224)
- [x] 2.2 Replace hardcoded `is_default`-based selection with `selectSmartDefaultPortion()`
- [x] 2.3 Ensure `quantity` uses the value from the utility instead of hardcoded `'1'`

## 3. InlineIngredientEditor

- [x] 3.1 Include `priority` and `rank` in `handleAddIngredient` portion mapping (line 244-251)
- [x] 3.2 Replace `is_default`-based selection + hardcoded `quantity: 0` with `selectSmartDefaultPortion()`
- [x] 3.3 New item `quantity` set to `1` (from utility), `isDirty: true` preserved

## 4. Verification

- [ ] 4.1 Test via CreateRecipePage: add ingredient with multiple portions → smart default selected
- [ ] 4.2 Test via InlineIngredientEditor: add ingredient with multiple portions → smart default selected (not 0)
- [ ] 4.3 Test fallback: add ingredient with only Gramm portion → quantity 100
- [x] 4.4 Run TypeScript type check in frontend-food: `npm run typecheck`
