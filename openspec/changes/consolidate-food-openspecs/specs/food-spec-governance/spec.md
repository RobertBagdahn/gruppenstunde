## ADDED Requirements

### Requirement: Canonical ownership of Food requirements
Each normative Food behavior SHALL have one canonical capability spec. Other Food specs MAY reference that capability but SHALL NOT redefine its model fields, terminology, or calculation formula.

#### Scenario: Shared calculation rule is referenced
- **WHEN** a new Food spec needs meal portion scaling
- **THEN** it references `meal-plan-effective-portions` instead of defining a second formula

### Requirement: Consistent Food terminology
Canonical Food specs SHALL use `Ingredient` for the standalone food model, `Material` for Supply-based equipment, `portions` for the recipe storage field, and `effective_portions` for meal-level scaling. The removed term `quantity_type` SHALL NOT appear in new normative requirements.

#### Scenario: New spec is reviewed
- **WHEN** a new Food requirement is added
- **THEN** it uses the canonical terms and does not introduce an alias for removed behavior

### Requirement: Food contract review
Changes affecting Food models, APIs, or frontend schemas SHALL identify the affected backend path, frontend path, schema contract, and migration need before implementation.

#### Scenario: Contract change is proposed
- **WHEN** a Food proposal changes a model or API field
- **THEN** the proposal or design names the relevant backend/frontend files and migration impact
