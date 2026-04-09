## Requirements

### Requirement: Meal event data model
The meal event system SHALL use a flat hierarchy: `MealEvent -> Meal -> MealItem`. Each `Meal` SHALL belong directly to a `MealEvent` via FK and SHALL have `start_datetime` and `end_datetime` fields.

#### Scenario: Meal belongs to MealEvent directly
- **WHEN** a Meal is created
- **THEN** it SHALL have a `meal_event` FK referencing the parent MealEvent
- **THEN** it SHALL have `start_datetime` (DateTimeField) and `end_datetime` (DateTimeField) indicating when the meal takes place
- **THEN** the combination of `(meal_event, start_datetime, meal_type)` SHALL be unique

### Requirement: Meal event detail response
The meal event detail API response SHALL return meals as a flat list with datetime information on each meal, instead of nested under day objects.

#### Scenario: Flat meals in detail response
- **WHEN** a user requests a meal event detail via `GET /api/meal-events/{meal_event_id}/`
- **THEN** the response SHALL contain a `meals` field (list of Meal objects)
- **THEN** each Meal object SHALL include `id`, `meal_type`, `start_datetime`, `end_datetime`, `day_part_factor`, and `items`
- **THEN** the response SHALL NOT contain a `days` field

#### Scenario: Meals ordered by datetime and type
- **WHEN** the meal event detail is returned
- **THEN** meals SHALL be ordered by `start_datetime` ascending, then by `meal_type`

### Requirement: Adding meals to a meal event
Users SHALL add meals directly to a meal event by specifying datetime information, without creating a day object first.

#### Scenario: Add a single meal
- **WHEN** a user sends `POST /api/meal-events/{meal_event_id}/meals/` with `meal_type`, `start_datetime`, and `end_datetime`
- **THEN** a new Meal SHALL be created with the specified datetime range and meal type
- **THEN** the response SHALL return the created Meal

#### Scenario: Duplicate meal type on same datetime rejected
- **WHEN** a user tries to add a meal with a `meal_type` that already exists for that `start_datetime` in the meal event
- **THEN** the API SHALL return HTTP 400 with an appropriate error message

### Requirement: Adding a day with default meals
Users SHALL be able to add a full day of default meals (breakfast, lunch, dinner) in one request.

#### Scenario: Add day with defaults
- **WHEN** a user sends `POST /api/meal-events/{meal_event_id}/days/` with a `date`
- **THEN** default meals (breakfast, lunch, dinner) SHALL be created for that date with appropriate `start_datetime` and `end_datetime` values
- **THEN** each default meal SHALL have the appropriate `day_part_factor` (breakfast=0.25, lunch=0.35, dinner=0.30)
- **THEN** the response SHALL return the list of created meals

#### Scenario: Day already has meals
- **WHEN** a user tries to add a day for a date that already has meals
- **THEN** the API SHALL return HTTP 400 with error "Dieser Tag existiert bereits im Essensplan"

### Requirement: Removing meals by date
Users SHALL be able to remove all meals for a specific date from a meal event.

#### Scenario: Remove all meals for a date
- **WHEN** a user sends `DELETE /api/meal-events/{meal_event_id}/days/?date=YYYY-MM-DD`
- **THEN** all meals for that date in the meal event SHALL be deleted
- **THEN** the response SHALL confirm success

#### Scenario: No meals for the given date
- **WHEN** a user tries to remove meals for a date that has no meals
- **THEN** the API SHALL return HTTP 404

### Requirement: Auto-generating meals on meal event creation
When a meal event is created with a date range (from event or explicit start_date+num_days), default meals SHALL be created directly without intermediate day objects.

#### Scenario: Event-bound meal event creation
- **WHEN** a meal event is created with an `event_id` that has start and end dates
- **THEN** default meals (breakfast, lunch, dinner) SHALL be created for each date in the event range
- **THEN** each meal SHALL reference the meal event directly

#### Scenario: Standalone meal event creation with date range
- **WHEN** a meal event is created with `start_date` and `num_days`
- **THEN** default meals SHALL be created for each date in the range
- **THEN** each meal SHALL reference the meal event directly

### Requirement: Meal event list response
The meal event list response SHALL show `meals_count` instead of `days_count`.

#### Scenario: Meals count in list
- **WHEN** a user requests the list of meal events via `GET /api/meal-events/`
- **THEN** each meal event SHALL include a `meals_count` field with the total number of meals
- **THEN** the response SHALL NOT include a `days_count` field

### Requirement: MealItem references recipe from recipe app
MealItem SHALL continue to reference Recipe via FK, but Recipe now inherits from Content. The FK relationship SHALL be updated to point to `recipe.Recipe`.

#### Scenario: Adding recipe to meal
- **WHEN** a user adds a recipe to a meal in the meal event
- **THEN** the MealItem SHALL reference the Recipe (which inherits from Content)
- **THEN** the recipe's Content base fields (title, image, tags) SHALL be accessible

### Requirement: EventDaySlot integration with MealEvent
The event day plan SHALL visually integrate meal slots from the MealEvent system. When an event has a linked MealEvent, meal times SHALL appear in the day plan timeline alongside other activity slots.

#### Scenario: MealEvent meals in day plan
- **WHEN** an event has a linked MealEvent with meals for a specific date
- **THEN** meal slots SHALL appear in the day plan timeline with recipe names
- **THEN** meal slots SHALL be visually distinguished from activity slots (different color/icon)
- **THEN** clicking a meal slot SHALL navigate to the MealEvent detail at `/meal-events/{id}`

#### Scenario: MealItem shows recipe in day plan
- **WHEN** a Meal in the MealEvent has MealItems (recipes)
- **THEN** the day plan meal slot SHALL list the recipe names
- **THEN** each recipe SHALL link to its Recipe detail page

### Requirement: Cockpit API endpoints
The system SHALL provide cockpit endpoints for aggregated meal event and meal data views.

#### Scenario: MealEvent cockpit overview
- **WHEN** a user requests `GET /api/meal-events/{id}/cockpit/`
- **THEN** the response SHALL return an aggregated overview of the entire meal event (totals, nutritional summaries, cost summaries)

#### Scenario: MealEvent cockpit day view
- **WHEN** a user requests `GET /api/meal-events/{id}/cockpit/day/?date=YYYY-MM-DD`
- **THEN** the response SHALL return aggregated data for that specific day within the meal event

#### Scenario: Meal cockpit detail
- **WHEN** a user requests `GET /api/meals/{id}/cockpit/`
- **THEN** the response SHALL return detailed nutritional and cost data for a single meal

### Requirement: Frontend routing
The meal event frontend SHALL be accessible at `/meal-events/`.

#### Scenario: Navigating to meal events
- **WHEN** a user navigates to `/meal-events/`
- **THEN** the meal event list page SHALL be displayed
- **WHEN** a user navigates to `/meal-events/{id}`
- **THEN** the meal event detail page SHALL be displayed

### Requirement: Export-Button auf MealEvent-Detailseite
Die MealEvent-Detailseite SHALL einen "Einkaufsliste erstellen"-Button anzeigen, der die aggregierte Einkaufsliste als persistente ShoppingList exportiert.

#### Scenario: Einkaufsliste aus MealEvent erstellen
- **WHEN** ein authentifizierter Nutzer auf der MealEvent-Detailseite "Einkaufsliste erstellen" klickt
- **THEN** SHALL die Shopping-List-API `POST /api/shopping-lists/from-meal-event/{id}/` aufgerufen werden
- **THEN** SHALL der MealEvent-Skalierungsfaktor (norm_portions * activity_factor * reserve_factor) angewendet werden
- **THEN** SHALL der Nutzer zur erstellten Einkaufsliste weitergeleitet werden

### Requirement: Skalierte Mengen in MealEvent-Shopping-Ansicht
Die bestehende Shopping-List-Ansicht im MealEvent SHALL die intelligente Einheiten-Umrechnung und natürliche Portionsanzeige verwenden.

#### Scenario: Shopping-Ansicht mit Einheiten-Umrechnung
- **WHEN** ein Nutzer die Shopping-List eines MealEvents ansieht (`GET /api/meal-events/{id}/shopping-list/`)
- **THEN** SHALL die Response zusätzlich `display_quantity` (formatierte Anzeige mit intelligenter Einheit) und `natural_portions` (Liste der natürlichen Portionsangaben) pro Item enthalten

#### Scenario: Echtzeit-Update bei Faktor-Änderung
- **WHEN** ein Nutzer `norm_portions`, `activity_factor` oder `reserve_factor` im MealEvent ändert
- **THEN** SHALL die Shopping-List-Ansicht mit den neuen Mengen aktualisiert werden
