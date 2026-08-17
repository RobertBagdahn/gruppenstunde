## 1. FactorInput precision fix

- [x] 1.1 Change `FactorInput.tsx` line 4: replace `toFixed(1)` with `toFixed(2)` in the `formatFactor` function — prevents silent precision loss on edit round-trips

## 2. Ingredient item layout restructure

- [x] 2.1 Restructure the ternary in `MealSlot.tsx` lines 441-450 so ingredient items show both the quantity display AND the editable FactorInput, matching the design in `design.md`
- [x] 2.2 In the read-only branch (not editable or synced), show both quantity display and factor display for ingredient items

## 3. Verification

- [x] 3.1 Test that ingredient items show FactorInput in an editable meal slot
- [x] 3.2 Test that FactorInput with `toFixed(2)` preserves values like `0.753` (displayed as `0,75`, saved as `0.753` when unchanged)
- [x] 3.3 Test that read-only mode (non-editable or synced) shows both quantity and factor statically
- [x] 3.4 Test mobile layout at 320px width — fields wrap cleanly without overflow
