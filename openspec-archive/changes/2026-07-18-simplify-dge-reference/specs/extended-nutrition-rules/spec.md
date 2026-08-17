## MODIFIED Requirements

### Requirement: DGE reference values

The system SHALL provide DGE reference values for daily nutritional requirements as static data in `supply/data/dge_reference.py`. The data SHALL include energy (kcal), protein (g), fat (g), carbohydrate (g), and fibre (g) for 10 age groups (1-3, 4-6, 7-9, 10-12, 13-14, 15-18, 19-24, 25-50, 51-64, 65-99) and both genders (male, female). A lookup function `get_dge_reference(age: int, gender: str)` SHALL return the reference values for a given age and gender by matching the age to the appropriate age group.

The data SHALL be sourceable from the DGE, ÖGE, SGE D-A-CH Referenzwerte für die Nährstoffzufuhr.

#### Scenario: Retrieve DGE reference for age group
- **WHEN** querying `get_dge_reference(age=14, gender="male")`
- **THEN** the system SHALL return the matching age group (13-14) reference values containing energy_kcal, protein_g, fat_g, carbohydrate_g, fibre_g

#### Scenario: Retrieve DGE reference for age outside range
- **WHEN** querying `get_dge_reference(age=0, gender="female")`
- **THEN** the system SHALL return `None`

## REMOVED Requirements

### Requirement: DGE reference values as database model

**Reason**: The `DgeReference` database model was never seeded (seed data was commented out with "model was simplified, seed data is outdated"). The static data in `supply/data/dge_reference.py` is the actual source of truth used by all active features. Removing the model eliminates dead code and unused Admin/Router/Schema infrastructure.

**Migration**: All consumers of DGE reference data SHALL use `get_dge_reference()` or `get_all_dge_reference()` from `supply/data/dge_reference.py`. The `/api/dge-references/` endpoint is removed. DGE reference data is available via `/api/norm-person/dge-reference` and `/api/norm-person/curves`.
