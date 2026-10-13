## ADDED Requirements

### Requirement: Material filter in recipe list
The recipe list SHALL filter by required material with `material_slug` ("mit") and `exclude_material_slug` ("ohne"), in both directions, stored in the URL state. The former `equipment_slug` filter MUST be removed.

#### Scenario: Without oven
- **WHEN** the user selects "ohne Backofen"
- **THEN** only recipes without the Backofen material are listed and the URL contains `exclude_material_slug=backofen`

#### Scenario: With pot
- **WHEN** the user selects "mit Topf"
- **THEN** only recipes requiring Topf are listed
