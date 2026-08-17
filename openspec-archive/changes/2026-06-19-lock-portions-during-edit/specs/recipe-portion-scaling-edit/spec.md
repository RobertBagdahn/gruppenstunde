## ADDED Requirements

### Requirement: Portion scaler locked during inline edit
The PortionScaler component SHALL be disabled when the InlineIngredientEditor is active to prevent inconsistent state between displayed quantities and saved quantities.

#### Scenario: PortionScaler disabled in edit mode
- **WHEN** the InlineIngredientEditor is open (isInlineEditMode is true)
- **THEN** the PortionScaler buttons SHALL be disabled
- **THEN** the PortionScaler input SHALL be readonly
- **THEN** a visual indicator (greyed out / reduced opacity) SHALL communicate the locked state

#### Scenario: PortionScaler re-enabled after edit mode closes
- **WHEN** the InlineIngredientEditor is closed (isInlineEditMode is false)
- **THEN** the PortionScaler SHALL return to its normal interactive state
