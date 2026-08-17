## MODIFIED Requirements

### Requirement: Automatic calorie coverage for external meals
When an external meal has no manual calorie value, its actual energy SHALL automatically equal its target coverage (`NORM_PERSON_DAILY_KCAL × day_part_factor`). A manual value SHALL override this automatic coverage. External meal costs SHALL additionally be aggregated as `external_cost_per_person × effective_portions` in cost summaries.

#### Scenario: Soll percentage entered, calories auto-filled
- **WHEN** a user marks a meal external and sets only its Soll to 0.3
- **THEN** the meal's energy SHALL equal `NORM_PERSON_DAILY_KCAL × 0.3`

#### Scenario: External cost included
- **WHEN** an external meal has `external_cost_per_person=8.50` and 20 effective portions
- **THEN** the cost summary SHALL include 170.00 Euro for that meal
