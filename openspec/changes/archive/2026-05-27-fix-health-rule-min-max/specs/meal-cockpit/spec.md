## ADDED Requirements

### Requirement: HealthRule supports min and max rule types
A HealthRule must declare whether it checks a minimum threshold (too little is bad) or a maximum threshold (too much is bad). The evaluation logic must respect this direction.

#### Scenario: Maximum rule evaluates correctly (e.g. sugar)
- **WHEN** a HealthRule has `rule_type="max"` with `threshold_green=10`, `threshold_yellow=20` and value is 5
- **THEN** status is "green"

#### Scenario: Maximum rule detects excess
- **WHEN** a HealthRule has `rule_type="max"` with `threshold_green=10`, `threshold_yellow=20` and value is 25
- **THEN** status is "red"

#### Scenario: Minimum rule evaluates correctly (e.g. protein)
- **WHEN** a HealthRule has `rule_type="min"` with `threshold_green=50`, `threshold_yellow=30` and value is 60
- **THEN** status is "green"

#### Scenario: Minimum rule detects deficiency
- **WHEN** a HealthRule has `rule_type="min"` with `threshold_green=50`, `threshold_yellow=30` and value is 10
- **THEN** status is "red"

#### Scenario: Empty day shows red for minimum rules
- **WHEN** a day has no recipes assigned and a HealthRule has `rule_type="min"` with `threshold_green=50`, `threshold_yellow=30`
- **THEN** status is "red" (value 0 < threshold_yellow 30)

#### Scenario: Empty day shows green for maximum rules
- **WHEN** a day has no recipes assigned and a HealthRule has `rule_type="max"` with `threshold_green=25`, `threshold_yellow=50`
- **THEN** status is "green" (value 0 <= threshold_green 25)
