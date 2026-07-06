## Why

The recipe editing mode displays and stores wrong ingredient quantities due to a **unit-label mismatch bug**. When a recipe ingredient uses a composite portion (e.g. "1 Portion Nudeln" = 125g, where the portion's underlying `measuring_unit` is "Gramm" but its `quantity` conversion factor is 125), the editor mislabels the input field as "Gramm" while the actual number represents a *multiple of the 125g portion*, not literal grams.

This caused real data corruption, confirmed by direct database inspection of recipe #434 ("Klassische Nudeln mit Tomatensoße"): a user entering "500" (believing it meant 500 grams) had the value interpreted as "500 × 125g portions", producing an absurd stored quantity (125 per serving = 15,625g of pasta). This is a **data-integrity bug**, not just a display glitch — mislabeled units lead users to enter values at the wrong order of magnitude, silently corrupting recipes.

Note: an earlier version of this proposal assumed the bug was in portion-count reactivity (`initialEditPortions` not updating the editor). Code review showed this is already handled correctly (internal `PortionScaler` + `rescaleForNewPortions()` + `toBasePerServing()` on save). That part of the original hypothesis is retracted; this revision focuses on the actual confirmed root cause.

## What Changes

- **Fix unit label in InlineIngredientEditor**: When the base (rank=1) portion is a composite unit (portion.quantity ≠ 1 of its measuring_unit), the editor SHALL display the portion's own name (e.g. "Portion Nudeln") instead of the underlying measuring_unit name (e.g. "Gramm"), so users understand they are entering multiples of that portion, not grams.
- **Add validation/warning for ambiguous portions**: Highlight portions with placeholder/likely-incorrect `weight_g` (e.g. `weight_g == 1.0` for non-gram-based portions) so editors/content managers can spot bad ingredient master data.
- **Data repair**: Correct already-corrupted quantities on affected recipes (recipe #434 already repaired as part of this investigation).
- **Test coverage**: Add tests verifying the editor always shows a unit label consistent with the numeric value being edited, across the "same-unit portion" (multiplier ≈ 1) and "composite portion" (multiplier > 1) cases.

## Capabilities

### New Capabilities

- `recipe-portion-unit-labeling-tests`: Test suite verifying correct unit labeling and quantity interpretation in the recipe ingredient editor across portion types (gram-based, composite/weight-based, piece-based).

### Modified Capabilities

- `recipe-editing-ui`: Modified requirement — `InlineIngredientEditor` must label the quantity input with the actual unit the number represents (the portion's own name when it is a composite unit), not the portion's underlying `measuring_unit.name`.

## Impact

**Affected Code:**
- Frontend: `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` (`normalizeItems()`, portion label resolution, `handlePortionChange`)
- Backend: No API contract changes required for the core fix

**Affected APIs:**
- None required for the core fix (purely frontend display/label logic). Optional future consideration: expose an `is_placeholder_weight` hint on `PortionOut` for ingredient master-data quality warnings — out of scope here.

**Affected Data:**
- Recipe #434 quantities already repaired via direct DB correction (documented in this change for traceability)
- Recommend a follow-up audit script (out of scope here) to detect similarly corrupted recipes with quantity ≈ portion.weight_g (the signature of this bug)

**Breaking Changes:** None — purely a bugfix to prevent mislabeled units from misleading users.
