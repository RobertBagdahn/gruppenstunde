## MODIFIED Requirements

### Requirement: Display recipe costs in meal plan
The cost dashboard SHALL clearly communicate when recipe cost data is incomplete or unavailable, instead of showing "–" or "0,00 €".

#### Scenario: Recipe with no priced ingredients
- **WHEN** a recipe has zero ingredients with `price_per_kg` set
- **THEN** the UI SHALL display "Keine Preise" in muted/gray text instead of "–"

#### Scenario: Recipe with partial price coverage
- **WHEN** a recipe has some but not all ingredients with prices
- **THEN** the UI SHALL display the calculated cost with a visual indicator that the cost is incomplete (e.g., "~12,50 €" or a warning icon)

#### Scenario: Summary cards show price coverage
- **WHEN** the total price coverage across all recipes is below 100%
- **THEN** the summary section SHALL display "X von Y Zutaten mit Preis" as context

#### Scenario: Daily cost table with missing prices
- **WHEN** a day has meals where all ingredients lack prices
- **THEN** the table SHALL show "–" instead of "0,00 €" to avoid implying the meal is free
