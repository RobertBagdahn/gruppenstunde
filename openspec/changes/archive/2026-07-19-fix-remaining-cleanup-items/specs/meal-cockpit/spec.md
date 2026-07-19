## MODIFIED Requirements

### Requirement: External meal energy scales with effective portions
When aggregating nutrition values for cockpit/ampel evaluation, external meal energy SHALL be multiplied by `effective_portions` to be consistent with internal meal aggregation.

#### Scenario: External meal with 5 portions
- **WHEN** an external meal has `external_energy_kcal=500` and the meal plan has `effective_portions=5`
- **THEN** the aggregated energy SHALL be `2500` kcal (500 × 5), not `500`

#### Scenario: External meal with 1 portion
- **WHEN** an external meal has `external_energy_kcal=500` and the meal plan has `effective_portions=1`
- **THEN** the aggregated energy SHALL be `500` kcal (unchanged)

#### Scenario: Internal meal aggregation unchanged
- **WHEN** an internal meal (recipe-based) is aggregated
- **THEN** the existing per-normportion aggregation logic SHALL remain unchanged
