## ADDED Requirements

### Requirement: Fixed price per person for external meals
External meals SHALL support a fixed price per person (`external_cost_per_person`) that is editable via the meal actions menu. The meal's total cost SHALL be computed as `external_cost_per_person × effective_portions` and flow into day and plan cost summaries and budget evaluation.

#### Scenario: Fixed price feeds budget calculation
- **WHEN** an external meal has `external_cost_per_person=12.0` and the effective portions are 15
- **THEN** the meal contributes 180.0 € to the day and plan cost totals

#### Scenario: Editing fixed price via menu
- **WHEN** a user enters a price per person for an external meal in the actions menu
- **THEN** `external_cost_per_person` SHALL be persisted and reflected in cost summaries

### Requirement: Automatic calorie coverage for external meals
When an external meal has no manual calorie value, its actual energy SHALL automatically equal its target coverage (`NORM_PERSON_DAILY_KCAL × day_part_factor`), so that the meal counts as fully covering its Soll. A manual value SHALL override this automatic coverage.

#### Scenario: Soll percentage entered, calories auto-filled
- **WHEN** a user marks a meal external and sets only its Soll to 0.3 (no manual kcal)
- **THEN** the meal's Ist energy SHALL equal `NORM_PERSON_DAILY_KCAL × 0.3` and display as ~100% covered

#### Scenario: Manual override wins
- **WHEN** an external meal has a manual `external_energy_kcal` value set
- **THEN** that manual value SHALL be used instead of the automatic coverage

### Requirement: Note and Soll editable for external meals
External meals SHALL allow editing their note and Soll (`day_part_factor`) via the actions menu, identically in both views.

#### Scenario: External meal note and Soll
- **WHEN** a user edits the note and Soll of an external meal
- **THEN** both SHALL be persisted and visible in the Tagesplan and Tabelle
