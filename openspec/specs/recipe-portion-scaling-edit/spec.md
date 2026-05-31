## ADDED Requirements

### Requirement: Proportional scaling on display portion change

When the user changes the displayed portion count in the recipe detail view or InlineIngredientEditor, all ingredient quantities are scaled proportionally. The database always stores per-1-person quantities (servings=1). Scaling is for display purposes and does not change stored values unless explicitly saving in edit mode.

#### Scenario: User views recipe for 4 persons

- **WHEN** User selects "4 Portionen" in the portion scaler
- **THEN** All ingredient quantities are multiplied by 4 for display (e.g., 62.5g → 250g, 0.75 Stück → 3 Stück)

#### Scenario: User views recipe for 1 person (default)

- **WHEN** User views recipe with default portion scaler (1 Portion)
- **THEN** All ingredient quantities are shown as stored in DB (per-person values)

#### Scenario: Quantities are rounded for display

- **WHEN** Scaling produces fractional values
- **THEN** Quantities are rounded according to quantity-display-formatting rules (< 2 → 0.1, 2-10 → 1, etc.)

### Requirement: Visual feedback after scaling

#### Scenario: Quantities change after scaling

- **WHEN** Servings value is changed and quantities are recalculated
- **THEN** All quantity inputs are marked as dirty and a brief visual highlight indicates the change

### Requirement: Improved ingredient row layout

#### Scenario: Unit label display

- **WHEN** An ingredient row is displayed in edit mode
- **THEN** The unit label has sufficient width to display common units (Gramm, Stück, Teelöffel, Esslöffel) without truncation
