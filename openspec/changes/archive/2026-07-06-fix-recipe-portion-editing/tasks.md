## 1. Setup & Test Infrastructure

- [x] 1.1 Create frontend test file: `frontend-food/src/lib/__tests__/cookingQuantityScale.test.ts` (if not exists) for scale/rescale helpers
- [x] 1.2 Create frontend test file: `frontend-food/src/components/recipe/__tests__/InlineIngredientEditor.normalizeItems.test.ts`
- [x] 1.3 Add test fixtures reproducing the three real portion shapes found in production data:
  - Composite: "1 Portion Nudeln" (measuring_unit=Gramm, quantity=125, weight_g=125)
  - Direct gram: "Gramm" (measuring_unit=Gramm, quantity=1, weight_g=1)
  - Piece: "Stück" (measuring_unit=Stück, quantity=1, weight_g=null)
- [x] 1.4 Add fixture reproducing recipe #434's exact original data shape for regression testing

## 2. Root Cause Regression Tests

- [x] 2.1 Test: `normalizeItems()` labels a composite portion (quantity != 1) with the portion's own `name`, not `measuring_unit_name`
- [x] 2.2 Test: `normalizeItems()` labels a direct-unit portion (quantity == 1) with `measuring_unit_name`
- [x] 2.3 Test: displayed quantity number for a composite portion equals the correct multiplier (e.g. 2.24), not the raw gram amount (280)
- [x] 2.4 Test: reproduce exact recipe #434 bug shape — assert label is NOT "Gramm" for the Nudeln item, and assert display does not read "125 Gramm"
- [x] 2.5 Test: piece-based portion ("Stück") retains correct label and quantity

## 3. Save-Path Regression Tests (verify no regression from label fix)

- [x] 3.1 Test: `handleSave()` still divides displayed quantity by `scale` correctly for composite portions (label change must not affect math)
- [x] 3.2 Test: editing a composite-portion quantity intentionally (e.g. change 8.96 → 10 at 4 persons) saves correct per-serving value (2.5)
- [x] 3.3 Test: `handlePortionChange()` (switching portion/unit dropdown) correctly recomputes quantity AND updates the label consistently
- [x] 3.4 Test: exchange-group items each retain their own correct label/quantity after a portion-count change via `handleEditPortionsChange`

## 4. Placeholder Portion Weight Warning

- [x] 4.1 Implement heuristic function `isSuspiciousPlaceholderWeight(portion)`: flags `weight_g === 1.0` combined with portion name not in a small-unit allowlist (e.g. "Gramm", "g", "Prise", "Messerspitze")
- [x] 4.2 Test: "große Dose" with weight_g=1.0 is flagged as suspicious
- [x] 4.3 Test: "Prise" with weight_g=1.0 is NOT flagged (legitimate small unit)
- [ ] 4.4 Add a subtle UI hint in `InlineIngredientEditor` next to ingredients with a flagged portion (dismissible, non-blocking) [DEFERRED: lower priority, tracked separately]

## 5. Frontend Implementation - Fix normalizeItems() Label Logic

- [x] 5.1 Update `normalizeItems()` in `InlineIngredientEditor.tsx`: derive `measuring_unit_name` as `basePortion.quantity !== 1 ? basePortion.name : basePortion.measuring_unit_name`
- [x] 5.2 Ensure `ingredient_portions` local type/mapping (`EditableItem.ingredient_portions`) includes `quantity` field needed for this check (currently only `weight_g`, `measuring_unit_name`, `rank` are mapped — add `quantity`; already present in the API response via `PortionSchema`, no backend change needed)
- [x] 5.3 Update `handlePortionChange()` to recompute the label the same way when the user switches portions (currently: `newPortion.measuring_unit_name ?? newPortion.name` — wrong precedence)
- [x] 5.4 **Fix portion `<option>` dropdown labels** (render section, `{p.measuring_unit_name || p.name}`): apply the same composite-vs-direct rule so e.g. "1 Portion Nudeln" and "Gramm" appear as distinct, correctly-labeled options instead of both showing "Gramm"
- [x] 5.5 Add explanatory comments distinguishing "portion multiplier" (the edited number) from "actual grams" (derived, not directly edited)
- [x] 5.6 Verify AI estimate application (`handleApplyEstimate`) and "add ingredient" flows (`handleAddIngredient`, `handleAddFromDialog`) also use the corrected label logic for newly added items (lines ~276, ~341, ~565 also default to `measuring_unit_name || name`)

## 6. Data Repair Verification (recipe #434)

- [x] 6.1 Repair recipe #434 quantities directly in DB to plausible pre-corruption values (completed during investigation: Nudeln=2.24, Tomaten=4.0, Zwiebel=0.0044, Knoblauchzehe=0.004, Öl=0.176, Salz=0.088)
- [x] 6.2 Verify recipe #434's cached nutrition/price fields are recalculated after the manual quantity update — confirmed: `cached_at` updated automatically, `cached_price_total`=0.40€ matches repaired quantities (signal fired on `save(update_fields=['quantity'])`)
- [x] 6.3 Add a regression test asserting recipe #434's Nudeln weight_g ≈ 280g (not 15625g) at 1 serving
- [x] 6.4 Document the manual repair (item IDs, old/new values) in a code comment or migration note for traceability

## 7. Manual QA

- [ ] 7.1 Open recipe #434 in the editor at 1 person — verify Nudeln shows a sensible label (e.g. "1 Portion Nudeln") and a small multiplier number, not "125 Gramm"
- [ ] 7.2 Open recipe #434 in the editor at 4 persons — verify all quantities scale correctly and labels stay consistent
- [ ] 7.3 Open the Nudeln portion dropdown — verify "1 Portion Nudeln" and "Gramm" appear as two distinct, correctly-labeled options (not both "Gramm")
- [ ] 7.4 Switch Nudeln's portion dropdown to "Gramm" — verify quantity updates to show actual grams (e.g. 280) labeled "Gramm"
- [ ] 7.5 Verify the "große Dose" (Tomaten) portion shows the placeholder-weight warning hint
- [ ] 7.6 Test on mobile viewport (320px minimum per project conventions)

**Note:** Manual QA deferred to separate QA session; automated tests verify core logic works correctly

## 8. Documentation & Follow-ups

- [x] 8.1 Add JSDoc comment to `normalizeItems()` explaining the composite-vs-direct-unit labeling rule with the Nudels example
- [ ] 8.2 Document recommended follow-up: audit script to find other recipes with `RecipeItem.quantity` suspiciously close to `portion.weight_g` (signature of this bug) — track as a separate future change, not part of this one [DEFERRED: tracked as separate change]
- [ ] 8.3 Document recommended follow-up: broader ingredient master-data review for portions with placeholder `weight_g` values across the whole ingredient catalog [DEFERRED: tracked as separate change]
- [x] 8.4 Ensure no `console.log` left in the label-derivation code; TypeScript strict mode compliance (no `any`)

