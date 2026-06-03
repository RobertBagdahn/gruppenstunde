## MODIFIED Requirements

### Requirement: Each meal SHALL display calorie coverage percentage
The UI MUST show a percentage indicating how much of the expected calorie need the meal covers. The expected need is `daily_target_kcal * day_part_factor`. The daily target is `2000 kcal * activity_factor` (base 2000 kcal). The meal energy value used for the comparison MUST be in kcal (converted from the stored kJ value via `/ 4,184`).

#### Scenario: Meal covers expected calories exactly
- **WHEN** the meal energy in kcal equals daily_target_kcal * day_part_factor (coverage = 100%)
- **THEN** the percentage shows "100%" in green

#### Scenario: Meal is significantly under target
- **WHEN** coverage is below 80%
- **THEN** the percentage shows in yellow (50-80%) or red (<50%)

#### Scenario: Meal exceeds target significantly
- **WHEN** coverage is above 120%
- **THEN** the percentage shows in yellow (120-150%) or red (>150%)
