## ADDED Requirements

### Requirement: Contribution unit matches parameter type

The suggested ingredient contribution value must be displayed with the correct unit for the nutritional parameter being shown.

#### Scenario: Energy parameter shows kJ
- **WHEN** improvement parameter is `energy_kj`
- **THEN** contribution is displayed with unit `kJ`

#### Scenario: Sodium parameter shows mg
- **WHEN** improvement parameter is `sodium_mg`
- **THEN** contribution is displayed with unit `mg`

#### Scenario: Gram-based parameters show g
- **WHEN** improvement parameter is `sugar_g`, `fat_sat_g`, `fat_g`, `protein_g`, `fibre_g`, `carbohydrate_g`, or `salt_g`
- **THEN** contribution is displayed with unit `g`
