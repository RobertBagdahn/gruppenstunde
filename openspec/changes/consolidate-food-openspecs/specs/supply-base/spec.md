## MODIFIED Requirements

### Requirement: Abstract Supply Base Class
The system SHALL provide an abstract Django model `Supply` as the base class for `Material`. The abstract model SHALL include the shared Supply fields and inherit from `SoftDeleteModel`. `Ingredient` SHALL be a standalone model and SHALL NOT inherit from `Supply`.

#### Scenario: Material uses Supply
- **WHEN** a Material model is inspected
- **THEN** it inherits the shared Supply fields and soft-delete behavior

#### Scenario: Ingredient is standalone
- **WHEN** an Ingredient model is inspected
- **THEN** it does not inherit Supply fields or Supply behavior
