## MODIFIED Requirements

### Requirement: Effektive Portionszahl pro Mahlzeit
The system SHALL define `effective_portions = override_portions or norm_portions`. Every meal-level quantity, energy, cost, shopping-list, and cooking-plan calculation SHALL use this value.

#### Scenario: Override is applied everywhere
- **WHEN** a meal has `norm_portions=10` and `override_portions=20`
- **THEN** every meal-level output uses 20 as its scaling denominator/target

#### Scenario: No override uses plan value
- **WHEN** a meal has no `override_portions`
- **THEN** `effective_portions` equals the plan's `norm_portions`
