## Why

Standalone ingredient items (added directly to a meal slot, not via a recipe) have the `factor` field completely hidden from users in the meal plan view. The UI condition at `MealSlot.tsx:441` only shows the FactorInput for non-ingredient items, making it impossible to adjust portion multipliers or correct wildly inflated kcal values. Additionally, `FactorInput.tsx` uses `toFixed(1)` which silently rounds values on every edit round-trip, causing precision drift.

## What Changes

- **BREAKING**: `MealSlot.tsx` ingredient item row — show FactorInput for ALL ingredient items instead of hiding it behind a static quantity display
- **BREAKING**: `FactorInput.tsx` — replace `toFixed(1)` with `toFixed(2)` or dynamic precision to prevent precision loss
- **BREAKING**: `MealSlot.tsx` — restructure ingredient item layout to show factor, quantity, price, and kcal side-by-side as editable fields
- Ingredient kcal display remains `item.energy_kcal / effPortions` (already correct, just was unusable because factor was invisible)

## Capabilities

### New Capabilities

*(none — this is a bug fix + UX improvement, no new capability)*

### Modified Capabilities

- `meal-plan/spec.md`: Ingredient items in meal slots gain editable factor and quantity fields

## Impact

- **Frontend**: `frontend-food/src/pages/planning/MealSlot.tsx` — restructure ingredient item rendering, add FactorInput, fix precision. `frontend-food/src/pages/planning/FactorInput.tsx` — fix `toFixed(1)` precision loss.
- **Backend**: No API changes needed — factor, quantity, and price are already persisted via existing `PATCH /api/meal-plans/{id}/meal-items/{itemId}/` endpoint.
- **APIs**: None changed — schemas `MealItemUpdateIn` already accepts `factor: float | None`.
