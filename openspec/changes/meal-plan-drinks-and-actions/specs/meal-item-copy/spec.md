## ADDED Requirements

### Requirement: Copy meal item within or across meals
A meal item SHALL be copyable, both as a duplicate within its own meal and as a copy into another meal. The copy SHALL preserve the source item's recipe/ingredient, quantity, measuring unit, factor and display name. A target meal that is `is_synced` SHALL NOT be a valid copy destination. The operation SHALL be exposed as a backend endpoint.

#### Scenario: Duplicate item within same meal
- **WHEN** a user duplicates an item without choosing a different target
- **THEN** a new item with identical recipe/ingredient, quantity, unit, factor and display name SHALL be created in the same meal

#### Scenario: Copy item into another meal
- **WHEN** a user copies an item and selects a different target meal
- **THEN** a new equivalent item SHALL be created in the target meal

#### Scenario: Synced target rejected
- **WHEN** a user attempts to copy an item into a `is_synced=true` meal
- **THEN** the operation SHALL be rejected with an error

### Requirement: Copy target selection dialog
The frontend SHALL provide a dialog (`CopyMealItemDialog`) to choose the destination meal, listing the plan's meals grouped by day and meal type, excluding reference and synced meals.

#### Scenario: Target list excludes synced and reference meals
- **WHEN** the copy dialog is opened
- **THEN** only non-reference, non-synced meals SHALL be selectable as targets, grouped by day and type
