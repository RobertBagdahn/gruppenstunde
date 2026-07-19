## MODIFIED Requirements

### Requirement: Scale-to-target rounds to 2 decimal places
The `scale_meal_to_target` endpoint SHALL round item factors to 2 decimal places instead of 1, preserving small factors that would otherwise be truncated to zero.

#### Scenario: Small factor preserved
- **WHEN** a meal item has `factor = 0.04` before scaling and the scale ratio is 1.0
- **THEN** the resulting factor SHALL be `0.04`, not `0.0`

#### Scenario: Normal factor rounds correctly
- **WHEN** a meal item has `factor = 1.0` and the scale ratio is 0.85
- **THEN** the resulting factor SHALL be `0.85`

#### Scenario: Factor display consistency
- **WHEN** scaled factors are displayed in the frontend
- **THEN** values SHALL be displayed with up to 2 decimal places
