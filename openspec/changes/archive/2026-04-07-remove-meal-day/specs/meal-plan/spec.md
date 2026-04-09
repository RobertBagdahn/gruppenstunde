## MODIFIED Requirements

### Requirement: Meal plan data model
The meal plan system SHALL use a flat hierarchy: `MealPlan -> Meal -> MealItem`. Each `Meal` SHALL belong directly to a `MealPlan` via FK and SHALL have a `date` field. The `MealDay` model SHALL be removed.

#### Scenario: Meal belongs to MealPlan directly
- **WHEN** a Meal is created
- **THEN** it SHALL have a `meal_plan` FK referencing the parent MealPlan
- **THEN** it SHALL have a `date` field (DateField) indicating which day it belongs to
- **THEN** the combination of `(meal_plan, date, meal_type)` SHALL be unique

#### Scenario: MealDay model removed
- **WHEN** the migration is applied
- **THEN** the `MealDay` model and its database table SHALL no longer exist
- **THEN** all existing meal data SHALL be preserved with `date` and `meal_plan` copied from the former `MealDay`

### Requirement: Meal plan detail response
The meal plan detail API response SHALL return meals as a flat list with date information on each meal, instead of nested under day objects.

#### Scenario: Flat meals in detail response
- **WHEN** a user requests a meal plan detail via `GET /{meal_plan_id}/`
- **THEN** the response SHALL contain a `meals` field (list of Meal objects)
- **THEN** each Meal object SHALL include `id`, `meal_type`, `date`, `time_start`, `time_end`, `day_part_factor`, and `items`
- **THEN** the response SHALL NOT contain a `days` field

#### Scenario: Meals ordered by date and type
- **WHEN** the meal plan detail is returned
- **THEN** meals SHALL be ordered by `date` ascending, then by `meal_type`

### Requirement: Adding meals to a meal plan
Users SHALL add meals directly to a meal plan by specifying a date, without creating a day object first.

#### Scenario: Add a single meal
- **WHEN** a user sends `POST /{meal_plan_id}/meals/` with `meal_type` and `date`
- **THEN** a new Meal SHALL be created with the specified date and meal type
- **THEN** the response SHALL return the created Meal

#### Scenario: Duplicate meal type on same date rejected
- **WHEN** a user tries to add a meal with a `meal_type` that already exists for that `date` in the meal plan
- **THEN** the API SHALL return HTTP 400 with an appropriate error message

### Requirement: Adding a day with default meals
Users SHALL be able to add a full day of default meals (breakfast, lunch, dinner) in one request.

#### Scenario: Add day with defaults
- **WHEN** a user sends `POST /{meal_plan_id}/days/` with a `date`
- **THEN** default meals (breakfast, lunch, dinner) SHALL be created for that date
- **THEN** each default meal SHALL have the appropriate `day_part_factor` (breakfast=0.25, lunch=0.35, dinner=0.30)
- **THEN** the response SHALL return the list of created meals

#### Scenario: Day already has meals
- **WHEN** a user tries to add a day for a date that already has meals
- **THEN** the API SHALL return HTTP 400 with error "Dieser Tag existiert bereits im Essensplan"

### Requirement: Removing meals by date
Users SHALL be able to remove all meals for a specific date from a meal plan.

#### Scenario: Remove all meals for a date
- **WHEN** a user sends `DELETE /{meal_plan_id}/days/?date=YYYY-MM-DD`
- **THEN** all meals for that date in the meal plan SHALL be deleted
- **THEN** the response SHALL confirm success

#### Scenario: No meals for the given date
- **WHEN** a user tries to remove meals for a date that has no meals
- **THEN** the API SHALL return HTTP 404

### Requirement: Auto-generating meals on meal plan creation
When a meal plan is created with a date range (from event or explicit start_date+num_days), default meals SHALL be created directly without intermediate MealDay objects.

#### Scenario: Event-bound meal plan creation
- **WHEN** a meal plan is created with an `event_id` that has start and end dates
- **THEN** default meals (breakfast, lunch, dinner) SHALL be created for each date in the event range
- **THEN** each meal SHALL reference the meal plan directly

#### Scenario: Standalone meal plan creation with date range
- **WHEN** a meal plan is created with `start_date` and `num_days`
- **THEN** default meals SHALL be created for each date in the range
- **THEN** each meal SHALL reference the meal plan directly

### Requirement: Meal plan list response
The meal plan list response SHALL show `meals_count` instead of `days_count`.

#### Scenario: Meals count in list
- **WHEN** a user requests the list of meal plans via `GET /`
- **THEN** each meal plan SHALL include a `meals_count` field with the total number of meals
- **THEN** the response SHALL NOT include a `days_count` field

## REMOVED Requirements

### Requirement: MealDay CRUD
**Reason**: MealDay model is removed. Day management is replaced by date-based meal operations.
**Migration**: Use `POST /{id}/days/` (convenience endpoint for default meals) and `DELETE /{id}/days/?date=` instead.
