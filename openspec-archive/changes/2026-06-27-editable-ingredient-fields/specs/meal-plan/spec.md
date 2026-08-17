## ADDED Requirements

### Requirement: Ingredient items have editable factor field in meal slots

Standalone ingredient items (MealItems with `ingredient_id` and no `recipe_id`) SHALL display an editable FactorInput alongside their quantity when `canEdit` is true and the meal is not synced. The FactorInput SHALL allow adjusting the `factor` field via the existing `PATCH /api/meal-plans/{id}/meal-items/{itemId}/` endpoint.

The FactorInput SHALL use `toFixed(2)` precision (not `toFixed(1)`) to preserve factor values through edit round-trips without silent precision loss.

#### Scenario: Ingredient item shows editable FactorInput
- **WHEN** a standalone ingredient item exists in an editable, non-synced meal slot
- **THEN** the item SHALL show the FactorInput alongside the quantity display (e.g. `×6000 g  ×[1,00]`)

#### Scenario: Ingredient item FactorInput saves via PATCH
- **WHEN** the user types `0,5` into the FactorInput of an ingredient item and presses Enter
- **THEN** the PATCH endpoint is called with `{ factor: 0.5 }` and the kcal display updates

#### Scenario: FactorInput preserves two decimal places
- **WHEN** the backend returns `factor=0.753`
- **THEN** the displayed value SHALL be `0,75` (not rounded to `0,8`)
- **AND** when the user saves without editing, the factor SHALL remain `0.753`

### Requirement: Read-only ingredient items show factor and quantity

When ingredient items are displayed in read-only mode (cannot edit or meal is synced), the layout SHALL show both the quantity AND the factor (if not 1.0), using the same precision as the editable version.

#### Scenario: Read-only ingredient shows factor
- **WHEN** a read-only meal slot displays an ingredient item with `factor=2.0`
- **THEN** the display SHALL show `×6000 g  ×2,00` (both quantity and factor visible)
