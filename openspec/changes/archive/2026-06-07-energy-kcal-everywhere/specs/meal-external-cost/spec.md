## MODIFIED Requirements

### Requirement: Automatic calorie coverage for external meals
When an external meal has no manual calorie value, its actual energy SHALL automatically equal its target coverage (`NORM_PERSON_DAILY_KCAL × day_part_factor`), so that the meal counts as fully covering its Soll. A manual value SHALL override this automatic coverage. Energy is stored as `external_energy_kcal` directly in the database, with no kJ conversion.

#### Scenario: Soll percentage entered, calories auto-filled
- **WHEN** a user marks a meal external and sets only its Soll to 0.3 (no manual kcal)
- **THEN** the meal's Ist energy SHALL equal `NORM_PERSON_DAILY_KCAL × 0.3` and display as ~100% covered

#### Scenario: Manual override wins
- **WHEN** an external meal has a manual `external_energy_kcal` value set
- **THEN** that manual value SHALL be used instead of the automatic coverage
- **THEN** the value is stored directly as `external_energy_kcal` in the database (no kJ intermediate step)
