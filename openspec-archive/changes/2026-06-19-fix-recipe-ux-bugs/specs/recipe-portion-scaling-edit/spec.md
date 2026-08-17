## MODIFIED Requirements

### Requirement: Proportional scaling on display portion change

When the user changes the displayed portion count (servings) in the recipe detail view or InlineIngredientEditor, all ingredient quantities SHALL be scaled proportionally. The database SHALL always store per-1-person quantities (servings=1). Scaling SHALL be for display purposes only and SHALL NOT change stored values. The InlineIngredientEditor SHALL use the recipe's servings value as the display scaling factor without normalizing quantities to 1-portion.

#### Scenario: User views recipe for 4 persons

- **WHEN** User selects "4 Portionen" in the portion scaler
- **THEN** All ingredient quantities SHALL be multiplied by 4 for display (e.g., 62.5g → 250g, 0.75 Stück → 3 Stück)

#### Scenario: User views recipe for 1 person (default)

- **WHEN** User views recipe with default portion scaler (1 Portion)
- **THEN** All ingredient quantities SHALL be shown as stored in DB (per-person values)

#### Scenario: Quantities are rounded for display

- **WHEN** Scaling produces fractional values
- **THEN** Quantities SHALL be rounded according to quantity-display-formatting rules (< 2 → 0.1, 2-10 → 1, etc.)

#### Scenario: Edit mode shows scaled quantities
- **WHEN** User opens the InlineIngredientEditor while recipe servings is N
- **THEN** Ingredient quantities SHALL be displayed as per-N-portions (not normalized to 1 portion)
- **THEN** Saving changes SHALL persist per-1-portion quantities (current values divided by N) with servings unchanged at 1

### Requirement: Visual feedback after scaling

#### Scenario: Quantities change after scaling

- **WHEN** Servings value is changed and quantities are recalculated
- **THEN** All quantity inputs SHALL be marked as dirty and a brief visual highlight indicates the change

### Requirement: Improved ingredient row layout

#### Scenario: Unit label display

- **WHEN** An ingredient row is displayed in edit mode
- **THEN** The unit label SHALL have sufficient width to display common units (Gramm, Stück, Teelöffel, Esslöffel) without truncation

## ADDED Requirements

### Requirement: Number input allows empty state
Number input fields for servings, portions, and quantities in the Food Frontend SHALL support an empty (cleared) state using string-based state management, with validation at submit time.

#### Scenario: User clears servings field
- **WHEN** user clears the servings number input (backspace/delete all characters)
- **THEN** the field SHALL appear empty (not show 0 or 1)
- **THEN** the field SHALL have a visual indicator if the value is required but empty

#### Scenario: User types new value into empty field
- **WHEN** user types a number into a previously cleared field
- **THEN** the value SHALL update to the typed number

#### Scenario: Submit with empty required field
- **WHEN** user submits a form with an empty required number field
- **THEN** the system SHALL show a validation error (e.g., "Bitte eine Portionszahl eingeben")
