## ADDED Requirements

### Requirement: Configurable day-part factors
The MealPlan model SHALL support configurable day-part factors (`day_part_factors` JSONField) mapping meal types to float factors, defaulting to standard defaults (breakfast=0.25, lunch=0.35, dinner=0.30, snack=0.10, dessert=0.00).
When a MealPlan is updated with new factors, all of its associated meals whose factor matches the old factor SHALL automatically be updated to use the new factor.

#### Scenario: MealPlan has default day-part factors
- **WHEN** a new MealPlan is created
- **THEN** it SHALL have the default day-part factors populated: breakfast=0.25, lunch=0.35, dinner=0.30, snack=0.10, dessert=0.00

#### Scenario: Updating day-part factors propagates to unmodified meals
- **WHEN** a MealPlan's breakfast day-part factor is updated from 0.25 to 0.30
- **THEN** all associated meals of type breakfast whose current factor is 0.25 SHALL be updated to 0.30, while meals with modified factors remain unchanged

### Requirement: External meals and manual calorie input
The Meal model SHALL support being marked as external (`is_external` BooleanField, default=False) with an optional manual calorie input (`external_energy_kj` in the database, exposed as `external_energy_kcal` in API and UI).
When a meal is marked as external, its actual energy value SHALL be determined solely by its manual calorie input, and its other nutrients and cost SHALL evaluate to zero.
When evaluating rules (cockpit dashboard) for an external meal, its status SHALL be neutral (green, Soll matches Ist, no warnings triggered).

#### Scenario: External meal aggregates only manual calories
- **WHEN** a meal has `is_external=True` and `external_energy_kcal=500`
- **THEN** its aggregated energy value SHALL be exactly 500 kcal (converted to kJ in the database), and its other nutrients and cost SHALL be 0.0

#### Scenario: External meal is neutral in cockpit evaluation
- **WHEN** a meal cockpit is evaluated for an external meal
- **THEN** the status of all evaluated rules SHALL be "green" (neutral) and no warnings or suggestions SHALL be triggered for this meal
