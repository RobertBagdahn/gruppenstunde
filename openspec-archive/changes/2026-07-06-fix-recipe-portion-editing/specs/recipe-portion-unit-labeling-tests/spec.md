## ADDED Requirements

### Requirement: Unit label matches the underlying quantity semantics

The system SHALL have automated tests verifying that the ingredient quantity input in `InlineIngredientEditor` always displays a unit label consistent with what the number represents, across all portion shapes present in real data (direct gram, direct piece, composite/weight-based portions).

#### Scenario: Composite portion (weight-based, quantity != 1) uses portion name as label
- **GIVEN** a `Portion` with `measuring_unit.name = "Gramm"`, `quantity = 125`, `weight_g = 125`, `name = "1 Portion Nudeln"`
- **AND** a `RecipeItem` with `quantity = 2.24` (per 1 serving) using that portion
- **WHEN** `normalizeItems()` processes this item for editing
- **THEN** the resulting `measuring_unit_name` used for display equals `"1 Portion Nudeln"`
- **AND** the resulting editable quantity equals `2.24` (not `280`)

#### Scenario: Direct gram portion (quantity == 1) uses "Gramm" as label
- **GIVEN** a `Portion` with `measuring_unit.name = "Gramm"`, `quantity = 1`, `weight_g = 1`
- **AND** a `RecipeItem` with `quantity = 5.0` using that portion
- **WHEN** `normalizeItems()` processes this item
- **THEN** the resulting label equals `"Gramm"`
- **AND** the resulting editable quantity equals `5.0` grams

#### Scenario: Piece-based portion (Stück) uses "Stück" as label
- **GIVEN** a `Portion` with `measuring_unit.name = "Stück"`, `quantity = 1`, `weight_g = null`
- **WHEN** `normalizeItems()` processes an item using that portion
- **THEN** the resulting label equals `"Stück"`

#### Scenario: Roundtrip regression test reproducing the original bug
- **GIVEN** the exact data shape found in production recipe #434 (item quantity=125, portion "1 Portion Nudeln" weight_g=125, measuring_unit="Gramm")
- **WHEN** the editor opens at 1 person, then the user reads the displayed quantity+label
- **THEN** the display must NOT read "125 Gramm" (the original bug)
- **AND** the display must read "1 Portion Nudeln" with quantity reflecting servings-of-that-portion, consistent with the true weight (125g × quantity)

### Requirement: Save always divides by the correct base portion factor regardless of label

The system SHALL ensure `handleSave()` continues to normalize edited quantities back to true per-1-serving amounts (via `toBasePerServing`), independent of which label was shown to the user — the label fix affects presentation only, not the underlying storage math.

#### Scenario: Saving an edited composite-portion quantity stores the correct per-serving value
- **GIVEN** editor is showing "8.96 Portion Nudeln" at editPortions=4 (i.e. 2.24 per serving × 4)
- **WHEN** user saves without further changes
- **THEN** the API receives `quantity = 2.24` for that item (8.96 / 4)
- **AND** `weight_g` derived from that (2.24 × 125) equals `280` for 1 serving — matching pre-edit value

#### Scenario: User edits a composite-portion quantity intentionally
- **GIVEN** editor shows "8.96 Portion Nudeln" at editPortions=4
- **WHEN** user changes the value to `10` (meaning 10 portions of 125g for 4 people = 1250g total)
- **THEN** on save the API receives `quantity = 2.5` (10 / 4)
- **AND** resulting weight_g per serving = 2.5 × 125 = 312.5g — matches user's intent

### Requirement: Placeholder portion weight detection is testable

The system SHALL have tests verifying detection of portions with likely-placeholder `weight_g` values (e.g. `weight_g == 1.0` combined with a portion name suggesting a larger real-world unit).

#### Scenario: Detect suspicious placeholder for "große Dose"
- **GIVEN** a portion named "große Dose" with `weight_g = 1.0`
- **WHEN** the placeholder-detection check runs
- **THEN** it flags this portion as suspicious (large-sounding name with weight_g suspiciously equal to 1)

#### Scenario: Do not flag legitimate small portions
- **GIVEN** a portion named "Prise" (pinch) with `weight_g = 1.0`
- **WHEN** the placeholder-detection check runs
- **THEN** it does NOT flag this portion (name is consistent with a small real-world weight)

### Requirement: Data-repair verification test for recipe #434

The system SHALL have a regression test confirming recipe #434's ingredient quantities are within plausible ranges after the data repair performed during this investigation.

#### Scenario: Recipe #434 quantities are plausible after repair
- **WHEN** loading recipe #434's ingredients at 1 serving
- **THEN** Nudeln weight_g is approximately 280g (not 15625g)
- **AND** all other ingredient weights are within plausible per-serving ranges for a pasta dish
