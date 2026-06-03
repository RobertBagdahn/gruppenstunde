## MODIFIED Requirements

### Requirement: Ingredients used in meal plans have price data
The system SHALL ensure that all ingredients actively used in meal plan recipes have a `price_per_kg` value, either from manual entry or automated estimation.

#### Scenario: Run price estimation for unpricied ingredients
- **WHEN** the `estimate_ingredient_prices` command is executed
- **THEN** it SHALL assign estimated `price_per_kg` values to all ingredients that are referenced by at least one RecipeItem but currently have `price_per_kg = NULL`

#### Scenario: Estimation uses realistic German supermarket prices
- **WHEN** estimating a price for an ingredient
- **THEN** the estimated value SHALL be within realistic range for German retail (0.49–20.00 €/kg depending on category)
