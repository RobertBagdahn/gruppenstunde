## MODIFIED Requirements

### Requirement: Proportional scaling on display portion change

When the user changes the displayed portion count in the recipe detail view, all ingredient quantities are scaled proportionally. The database always stores per-1-person quantities (servings=1). Scaling is display-only and does not persist.

#### Scenario: User views recipe for 4 persons

- **WHEN** User selects "4 Portionen" in the portion scaler
- **THEN** All ingredient quantities are multiplied by 4 for display (e.g., 62.5g → 250g, 0.75 Stück → 3 Stück)

#### Scenario: User views recipe for 1 person (default)

- **WHEN** User views recipe with default portion scaler (1 Portion)
- **THEN** All ingredient quantities are shown as stored in DB (per-person values)

#### Scenario: Quantities are rounded for display

- **WHEN** Scaling produces fractional values
- **THEN** Quantities are rounded according to quantity-display-formatting rules (< 2 → 0.1, 2-10 → 1, etc.)
