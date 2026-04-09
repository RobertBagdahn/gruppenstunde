## MODIFIED Requirements

### Requirement: Meal plan data model
The meal plan system SHALL use a flat hierarchy: `MealEvent -> Meal -> MealItem`. `MealPlan` SHALL be renamed to `MealEvent`. Each `Meal` SHALL belong directly to a `MealEvent` via FK and SHALL have `start_datetime` (DateTimeField) and `end_datetime` (DateTimeField) instead of separate `date`, `time_start`, and `time_end` fields. Day grouping SHALL be computed via `start_datetime__date` queries.

#### Scenario: Meal belongs to MealEvent directly
- **WHEN** a Meal is created
- **THEN** it SHALL have a `meal_event` FK referencing the parent MealEvent
- **THEN** it SHALL have a `start_datetime` field (DateTimeField) indicating when the meal starts
- **THEN** it SHALL have an `end_datetime` field (DateTimeField) indicating when the meal ends
- **THEN** the combination of `(meal_event, start_datetime date-part, meal_type)` SHALL be unique (validated in save/clean)

### Requirement: Meal plan detail response
The meal event detail API response SHALL return meals as a flat list with datetime information on each meal, instead of nested under day objects.

#### Scenario: Flat meals in detail response
- **WHEN** a user requests a meal event detail via `GET /api/meal-events/{id}/`
- **THEN** the response SHALL contain a `meals` field (list of Meal objects)
- **THEN** each Meal object SHALL include `id`, `meal_type`, `start_datetime`, `end_datetime`, `day_part_factor`, and `items`
- **THEN** the response SHALL NOT contain a `days` field

#### Scenario: Meals ordered by start_datetime
- **WHEN** the meal event detail is returned
- **THEN** meals SHALL be ordered by `start_datetime` ascending

### Requirement: Adding meals to a meal event
Users SHALL add meals directly to a meal event by specifying start_datetime, without creating a day object first.

#### Scenario: Add a single meal
- **WHEN** a user sends `POST /api/meal-events/{id}/meals/` with `meal_type`, `start_datetime`, and `end_datetime`
- **THEN** a new Meal SHALL be created with the specified datetimes and meal type
- **THEN** the response SHALL return the created Meal

#### Scenario: Duplicate meal type on same date rejected
- **WHEN** a user tries to add a meal with a `meal_type` that already exists for the same date (extracted from start_datetime) in the meal event
- **THEN** the API SHALL return HTTP 400 with an appropriate error message

### Requirement: Adding a day with default meals
Users SHALL be able to add a full day of default meals (breakfast, lunch, dinner) in one request.

#### Scenario: Add day with defaults
- **WHEN** a user sends `POST /api/meal-events/{id}/days/` with a `date`
- **THEN** default meals (breakfast, lunch, dinner) SHALL be created for that date
- **THEN** breakfast SHALL have start_datetime at date 08:00 UTC, end_datetime at date 09:00 UTC
- **THEN** lunch SHALL have start_datetime at date 12:00 UTC, end_datetime at date 13:00 UTC
- **THEN** dinner SHALL have start_datetime at date 18:00 UTC, end_datetime at date 19:00 UTC
- **THEN** each default meal SHALL have the appropriate `day_part_factor` (breakfast=0.25, lunch=0.35, dinner=0.30)

#### Scenario: Day already has meals
- **WHEN** a user tries to add a day for a date that already has meals
- **THEN** the API SHALL return HTTP 400 with error "Dieser Tag existiert bereits im Essensplan"

### Requirement: Removing meals by date
Users SHALL be able to remove all meals for a specific date from a meal event.

#### Scenario: Remove all meals for a date
- **WHEN** a user sends `DELETE /api/meal-events/{id}/days/?date=YYYY-MM-DD`
- **THEN** all meals whose start_datetime falls on that date SHALL be deleted
- **THEN** the response SHALL confirm success

#### Scenario: No meals for the given date
- **WHEN** a user tries to remove meals for a date that has no meals
- **THEN** the API SHALL return HTTP 404

### Requirement: Auto-generating meals on meal event creation
When a meal event is created with a date range (from event or explicit start_date+num_days), default meals SHALL be created directly.

#### Scenario: Event-bound meal event creation
- **WHEN** a meal event is created with an `event_id` that has start and end dates
- **THEN** default meals (breakfast, lunch, dinner) SHALL be created for each date in the event range with appropriate start/end datetimes

#### Scenario: Standalone meal event creation with date range
- **WHEN** a meal event is created with `start_date` and `num_days`
- **THEN** default meals SHALL be created for each date in the range with appropriate start/end datetimes

### Requirement: Meal event list response
The meal event list response SHALL show `meals_count`.

#### Scenario: Meals count in list
- **WHEN** a user requests the list of meal events via `GET /api/meal-events/`
- **THEN** each meal event SHALL include a `meals_count` field with the total number of meals

### Requirement: MealItem references recipe from recipe app
MealItem SHALL reference Recipe via FK. The FK relationship SHALL point to `recipe.Recipe`.

#### Scenario: Adding recipe to meal
- **WHEN** a user adds a recipe to a meal in the meal event
- **THEN** the MealItem SHALL reference the Recipe (which inherits from Content)
- **THEN** the recipe's Content base fields (title, image, tags) and cached nutritional values SHALL be accessible

### Requirement: EventDaySlot integration with MealEvent
The event day plan SHALL visually integrate meal slots from the MealEvent system.

#### Scenario: MealEvent meals in day plan
- **WHEN** an event has a linked MealEvent with meals for a specific date
- **THEN** meal slots SHALL appear in the day plan timeline with recipe names
- **THEN** meal slots SHALL be visually distinguished from activity slots (different color/icon)
- **THEN** clicking a meal slot SHALL navigate to the MealEvent detail

#### Scenario: MealItem shows recipe in day plan
- **WHEN** a Meal in the MealEvent has MealItems (recipes)
- **THEN** the day plan meal slot SHALL list the recipe names
- **THEN** each recipe SHALL link to its Recipe detail page

## RENAMED Requirements

- FROM: "Meal plan list response" TO: "Meal event list response"
- FROM: "Auto-generating meals on meal plan creation" TO: "Auto-generating meals on meal event creation"
