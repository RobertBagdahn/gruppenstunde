## RENAMED Requirements

### Requirement: Meal event data model
FROM: MealEvent
TO: MealPlan

All references to `MealEvent` in model names, schema names, API paths, and frontend routes SHALL be renamed to `MealPlan` / `meal-plan` / `meal_plan`. The DB table `planner_mealplan` remains unchanged.

#### Scenario: API route renamed
- **WHEN** a client accesses the meal plan API
- **THEN** the base URL SHALL be `/api/meal-plans/` instead of `/api/meal-events/`

#### Scenario: Frontend routes renamed
- **WHEN** a user navigates to the meal plan feature
- **THEN** the URL SHALL be `/meal-plans/` instead of `/meal-events/`

#### Scenario: Legacy URL redirect
- **WHEN** a user navigates to `/meal-events/*`
- **THEN** the system SHALL redirect to the corresponding `/meal-plans/*` route

## MODIFIED Requirements

### Requirement: Meal plan detail response
The meal plan detail API response SHALL return meals as a flat list with datetime information on each meal, instead of nested under day objects.

#### Scenario: Flat meals in detail response
- **WHEN** a user requests a meal plan detail via `GET /api/meal-plans/{id}/`
- **THEN** the response SHALL contain a `meals` field (list of Meal objects)
- **THEN** each Meal object SHALL include `id`, `meal_type`, `start_datetime`, `end_datetime`, `day_part_factor`, and `items`
- **THEN** the response SHALL NOT contain a `days` field

### Requirement: Adding meals to a meal plan
Users SHALL add meals directly to a meal plan by specifying datetime information, without creating a day object first.

#### Scenario: Add a single meal
- **WHEN** a user sends `POST /api/meal-plans/{id}/meals/` with `meal_type`, `start_datetime`, and `end_datetime`
- **THEN** a new Meal SHALL be created with the specified datetime range and meal type

### Requirement: Adding a day with default meals
Users SHALL be able to add a full day of default meals (breakfast, lunch, dinner) in one request.

#### Scenario: Add day with defaults
- **WHEN** a user sends `POST /api/meal-plans/{id}/days/` with a `date`
- **THEN** default meals (breakfast, lunch, dinner) SHALL be created for that date

### Requirement: Removing meals by date
Users SHALL be able to remove all meals for a specific date from a meal plan.

#### Scenario: Remove all meals for a date
- **WHEN** a user sends `DELETE /api/meal-plans/{id}/days/?date=YYYY-MM-DD`
- **THEN** all meals for that date in the meal plan SHALL be deleted

### Requirement: Meal plan list response
The meal plan list response SHALL show `meals_count`.

#### Scenario: Meals count in list
- **WHEN** a user requests the list of meal plans via `GET /api/meal-plans/`
- **THEN** each meal plan SHALL include a `meals_count` field

### Requirement: Cockpit API endpoints
The system SHALL provide cockpit endpoints for aggregated meal plan data.

#### Scenario: MealPlan cockpit overview
- **WHEN** a user requests `GET /api/meal-plans/{id}/cockpit/`
- **THEN** the response SHALL return an aggregated overview

### Requirement: Frontend routing
The meal plan frontend SHALL be accessible at `/meal-plans/`.

#### Scenario: Navigating to meal plans
- **WHEN** a user navigates to `/meal-plans/`
- **THEN** the meal plan list page SHALL be displayed
- **WHEN** a user navigates to `/meal-plans/{id}`
- **THEN** the meal plan detail page SHALL be displayed

### Requirement: Export-Button auf MealPlan-Detailseite
Die MealPlan-Detailseite SHALL einen "Einkaufsliste erstellen"-Button anzeigen.

#### Scenario: Einkaufsliste aus MealPlan erstellen
- **WHEN** ein authentifizierter Nutzer auf der MealPlan-Detailseite "Einkaufsliste erstellen" klickt
- **THEN** SHALL die Shopping-List-API `POST /api/shopping-lists/from-meal-plan/{id}/` aufgerufen werden
