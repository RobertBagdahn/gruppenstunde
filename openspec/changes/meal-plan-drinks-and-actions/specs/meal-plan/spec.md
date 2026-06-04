## MODIFIED Requirements

### Requirement: External meals and manual calorie input
The Meal model SHALL support being marked as external (`is_external` BooleanField, default=False) with an optional manual calorie input (`external_energy_kj` in the database, exposed as `external_energy_kcal` in API and UI) and a fixed price per person (`external_cost_per_person` FloatField, nullable).

When a meal is marked as external:
- Its actual energy value SHALL be its manual calorie input if set; otherwise it SHALL automatically default to its target coverage `NORM_PERSON_DAILY_KCAL × day_part_factor` (converted to kJ in the database).
- Its cost SHALL be `external_cost_per_person × effective_portions` (where `effective_portions = override_portions ?? norm_portions`); if `external_cost_per_person` is null, cost SHALL be 0.0.
- Its other nutrients SHALL evaluate to zero.

When evaluating rules (cockpit dashboard) for an external meal, its status SHALL be neutral (green, Soll matches Ist, no warnings triggered).

#### Scenario: External meal without manual calories defaults to target
- **WHEN** a meal has `is_external=True`, `day_part_factor=0.3` and `external_energy_kcal=null`
- **THEN** its aggregated energy SHALL equal `NORM_PERSON_DAILY_KCAL × 0.3` kcal (converted to kJ)

#### Scenario: External meal with manual calories overrides target
- **WHEN** a meal has `is_external=True` and `external_energy_kcal=500`
- **THEN** its aggregated energy value SHALL be exactly 500 kcal (converted to kJ in the database)

#### Scenario: External meal computes cost from fixed price per person
- **WHEN** a meal has `is_external=True`, `external_cost_per_person=12.0`, no override and the plan has `norm_portions=15`
- **THEN** its total cost SHALL be `12.0 × 15 = 180.0` €

#### Scenario: External meal without fixed price has zero cost
- **WHEN** a meal has `is_external=True` and `external_cost_per_person=null`
- **THEN** its total cost SHALL be 0.0

#### Scenario: External meal is neutral in cockpit evaluation
- **WHEN** a meal cockpit is evaluated for an external meal
- **THEN** the status of all evaluated rules SHALL be "green" (neutral) and no warnings or suggestions SHALL be triggered for this meal

## ADDED Requirements

### Requirement: Drinks meal type
The Meal model SHALL support a `drinks` meal type (`MealTypeChoices.DRINKS`) with a default `day_part_factor` of 0.0. The `drinks` type SHALL be included in `DEFAULT_MEAL_TYPES` so that newly created days automatically receive a drinks slot, and in `MEAL_TYPE_DEFAULT_TIMES`. Existing meal plans SHALL NOT be retroactively migrated to add drinks slots.

#### Scenario: New day auto-creates a drinks slot
- **WHEN** a new day is added to a meal plan
- **THEN** a meal of type `drinks` SHALL be created automatically with `day_part_factor=0.0`

#### Scenario: Existing plans are not migrated
- **WHEN** the change is deployed
- **THEN** no data migration SHALL add drinks slots to days that existed before; they remain addable via the existing add-meal action
