## ADDED Requirements

### Requirement: Proportional scaling on servings change

When the user changes the base servings number in the InlineIngredientEditor, all ingredient quantities must be proportionally scaled by the ratio `newServings / oldServings`.

#### Scenario: User doubles servings

- **WHEN** User changes servings from 4 to 8
- **THEN** All ingredient quantities are multiplied by 2 (e.g., 250g → 500g, 3 Stück → 6 Stück)

#### Scenario: User halves servings

- **WHEN** User changes servings from 4 to 2
- **THEN** All ingredient quantities are divided by 2 (e.g., 250g → 125g)

#### Scenario: Quantities are rounded

- **WHEN** Scaling produces fractional values
- **THEN** Quantities are rounded to max 2 decimal places

### Requirement: Visual feedback after scaling

#### Scenario: Quantities change after scaling

- **WHEN** Servings value is changed and quantities are recalculated
- **THEN** All quantity inputs are marked as dirty and a brief visual highlight indicates the change

### Requirement: Improved ingredient row layout

#### Scenario: Unit label display

- **WHEN** An ingredient row is displayed in edit mode
- **THEN** The unit label has sufficient width to display common units (Gramm, Stück, Teelöffel, Esslöffel) without truncation
