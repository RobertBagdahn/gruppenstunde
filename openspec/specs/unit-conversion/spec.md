## ADDED Requirements

### Requirement: UnitConversion Model
The system SHALL provide a UnitConversion model with fields: from_unit, to_unit, factor (Decimal), and ingredient (optional FK for ingredient-specific densities).

#### Scenario: Generic unit conversion lookup
- **WHEN** a conversion is requested for from_unit and to_unit without a specific ingredient
- **THEN** the system SHALL return the generic conversion factor

#### Scenario: Ingredient-specific conversion takes priority
- **WHEN** a conversion is requested and both a generic and ingredient-specific conversion exist
- **THEN** the system SHALL return the ingredient-specific conversion factor

#### Scenario: Fallback to generic when no specific exists
- **WHEN** a conversion is requested for an ingredient that has no specific conversion but a generic one exists
- **THEN** the system SHALL fall back to the generic conversion factor

### Requirement: Unit Conversion API
The system SHALL provide GET /api/unit-conversions/?from_unit=&to_unit=&ingredient= for looking up conversion factors.

#### Scenario: Query with all parameters
- **WHEN** a client requests a conversion with from_unit, to_unit, and ingredient parameters
- **THEN** the system SHALL return the matching conversion factor using specific > generic fallback

#### Scenario: No conversion found
- **WHEN** no conversion exists for the given unit pair
- **THEN** the system SHALL return HTTP 404

### Requirement: Seed Data
The system MUST include seed data for common German cooking conversions (EL to g, TL to ml, Tasse to ml, Prise to g, etc.).

#### Scenario: Seed data available after migration
- **WHEN** the data migration has been applied
- **THEN** the system SHALL have standard conversions for EL, TL, Tasse, Prise, Messerspitze available
