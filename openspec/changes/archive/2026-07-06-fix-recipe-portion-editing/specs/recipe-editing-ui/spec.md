## MODIFIED Requirements

### Requirement: InlineIngredientEditor displays a unit label consistent with the edited number

The system SHALL label each ingredient's quantity input with the unit that the displayed number actually represents. When the base (rank=1) portion used for editing is a composite unit — i.e. `portion.quantity != 1` relative to its `measuring_unit` (for example "1 Portion Nudeln" = 125 × Gramm) — the editor SHALL show the portion's own name (e.g. "Portion Nudeln") as the label, not the underlying `measuring_unit.name` (e.g. "Gramm").

- **MODIFIED BEHAVIOR**: `normalizeItems()` SHALL derive the displayed unit label from `basePortion.name` when `basePortion.quantity != 1`, and from `basePortion.measuring_unit_name` only when the portion is a direct 1:1 unit (`portion.quantity == 1`, e.g. plain "Gramm" or "Stück" portions)
- **MODIFIED BEHAVIOR**: The quantity number shown SHALL always be interpretable using the displayed label without additional context

#### Scenario: Composite portion shows its own name, not the base measuring unit
- **WHEN** editor opens for an ingredient whose base (rank=1) portion is "1 Portion Nudeln" (125g, measuring_unit="Gramm", portion.quantity=125)
- **AND** the database quantity for 1 serving is 2.24 (i.e. 2.24 × 125g = 280g)
- **THEN** the editor displays the number `2.24` labeled **"Portion Nudeln"**, not "Gramm"
- **AND** at 4 persons the editor displays `8.96` still labeled "Portion Nudeln"

#### Scenario: Direct gram-based portion still shows "Gramm"
- **WHEN** editor opens for an ingredient whose base (rank=1) portion is "Gramm" (weight_g=1, measuring_unit="Gramm", portion.quantity=1)
- **THEN** the editor displays the quantity labeled "Gramm", and the number equals the actual gram amount

#### Scenario: Piece-based portion shows its own unit name
- **WHEN** editor opens for an ingredient whose base portion is "Stück" (measuring_unit="Stück", portion.quantity=1)
- **THEN** the editor displays the quantity labeled "Stück"

### Requirement: Portion switch recalculates both quantity and label consistently

When the user changes the measuring unit/portion dropdown for an ingredient in the editor, the system SHALL recompute the quantity for the new portion and keep the displayed label in sync with the new portion's actual meaning (composite vs. direct unit).

#### Scenario: Switching from a composite portion to a direct gram portion
- **WHEN** user switches an ingredient from "Portion Nudeln" (125g each) to "Gramm"
- **THEN** the underlying gram amount (e.g. 280g at 1 serving) is preserved
- **AND** the displayed number becomes `280` labeled "Gramm" (not `2.24` labeled "Gramm")

### Requirement: Portion dropdown options are individually distinguishable

The system SHALL render each selectable portion option in the unit-switch dropdown with a label that reflects its own identity, so that composite portions (e.g. "1 Portion Nudeln") are never visually indistinguishable from a plain measuring-unit portion (e.g. "Gramm") that happens to share the same underlying `measuring_unit`.

#### Scenario: Dropdown shows distinct labels for composite and direct portions of the same ingredient
- **GIVEN** an ingredient with portions "1 Portion Nudeln" (quantity=125, measuring_unit=Gramm) and "Gramm" (quantity=1, measuring_unit=Gramm)
- **WHEN** the user opens the portion dropdown for that ingredient
- **THEN** the options read "1 Portion Nudeln" and "Gramm" respectively
- **AND** they are NOT both rendered as "Gramm"

### Requirement: Placeholder/likely-incorrect portion weights are flagged

The system SHOULD surface a warning when a portion's `weight_g` looks like an unset placeholder (e.g. `weight_g == 1.0` while the portion name suggests a larger real-world unit, such as "große Dose").

#### Scenario: Warning shown for suspicious placeholder weight
- **WHEN** editor loads an ingredient whose assigned portion has `weight_g == 1.0` and a name indicating a larger unit (e.g. "große Dose", "Packung")
- **THEN** the editor shows a subtle warning hint next to that ingredient (e.g. "Gewicht dieser Portion wirkt unplausibel — bitte prüfen")

### Requirement: Exchange groups in edit mode scale consistently

The system SHALL scale all options within an exchange group proportionally to the portion multiplier, and each option SHALL retain its own correct unit label per the rules above.

#### Scenario: Exchange group options stay in sync during portion change
- **WHEN** recipe has exchange group "Pasta OR Rice" and portion changes from 4 to 6
- **THEN** both options scale by same factor (1.5×)
- **AND** each option's label still matches its own portion type (e.g. "Portion Nudeln" vs. "Gramm")
