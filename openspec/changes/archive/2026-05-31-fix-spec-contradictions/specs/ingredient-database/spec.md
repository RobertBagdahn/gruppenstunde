## MODIFIED Requirements

### Requirement: Ingredient is standalone model
Ingredient SHALL be a standalone Django model (`models.Model`), NOT inheriting from `Supply`. This is because Ingredient has 30+ nutritional/score fields that have nothing in common with the Supply base class (which only provides name, slug, description, image). `price_per_kg` (DecimalField) SHALL be the sole price field — no separate Price model.

#### Scenario: Ingredient has price_per_kg as only price field
- **WHEN** an Ingredient is created or updated
- **THEN** `price_per_kg` SHALL be settable directly on the Ingredient
- **THEN** there SHALL be no separate Price model or Price table

#### Scenario: Ingredient lives in supply app
- **WHEN** Ingredient is accessed
- **THEN** it SHALL be available as `supply.Ingredient`
- **THEN** it SHALL NOT inherit any fields from the abstract Supply class

## REMOVED Requirements

### Requirement: Ingredient inherits from Supply
**Reason**: Ingredient was never meant to inherit from Supply. It has 30+ nutritional/score fields with no overlap to Supply (name, slug, description, image). The code confirms Ingredient is standalone.
**Migration**: No code migration needed — code already implements Ingredient as standalone.
