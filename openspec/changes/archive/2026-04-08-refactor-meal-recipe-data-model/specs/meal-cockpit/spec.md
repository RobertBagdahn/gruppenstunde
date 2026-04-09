## ADDED Requirements

### Requirement: HealthRule data model
The system SHALL provide a `HealthRule` model for configurable traffic-light thresholds. Each rule SHALL have: `name` (CharField), `description` (TextField), `parameter` (CharField, e.g. "energy_kj", "sugar_g", "price_total", "nutri_class"), `scope` (CharField with choices: meal_event, day, meal, recipe, ingredient), `threshold_green` (FloatField), `threshold_yellow` (FloatField), `unit` (CharField), `tip_text` (TextField for recommendation when yellow/red), `is_active` (BooleanField, default True), `sort_order` (IntegerField).

#### Scenario: Creating a health rule for sugar per meal
- **WHEN** an admin creates a HealthRule with parameter="sugar_g", scope="meal", threshold_green=15.0, threshold_yellow=30.0
- **THEN** the rule SHALL be stored and active
- **THEN** meals with less than 15g sugar per Normportion SHALL show green
- **THEN** meals with 15-30g sugar per Normportion SHALL show yellow
- **THEN** meals with more than 30g sugar per Normportion SHALL show red

#### Scenario: Health rule validation
- **WHEN** a HealthRule is created with threshold_green >= threshold_yellow
- **THEN** the system SHALL reject the entry with a validation error

### Requirement: Health rules API
The system SHALL provide a public REST endpoint to retrieve all active health rules.

#### Scenario: List active health rules
- **WHEN** a GET request is made to `/api/health-rules/`
- **THEN** the system SHALL return all active HealthRule entries ordered by sort_order
- **THEN** each entry SHALL include name, description, parameter, scope, threshold_green, threshold_yellow, unit, tip_text

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user requests `/api/health-rules/`
- **THEN** the system SHALL return the rules (no authentication required)

### Requirement: MealEvent cockpit API
The system SHALL provide REST endpoints for aggregated traffic-light data at MealEvent, day, and meal level.

#### Scenario: MealEvent-level cockpit
- **WHEN** a GET request is made to `/api/meal-events/{id}/cockpit/`
- **THEN** the system SHALL return aggregated nutritional values for all meals in the MealEvent
- **THEN** each active HealthRule with scope="meal_event" SHALL be evaluated
- **THEN** the response SHALL include for each rule: rule_id, rule_name, parameter, current_value, status ("green", "yellow", "red"), tip_text (only if yellow/red)

#### Scenario: Day-level cockpit
- **WHEN** a GET request is made to `/api/meal-events/{id}/cockpit/day/?date=YYYY-MM-DD`
- **THEN** the system SHALL aggregate nutritional values for all meals on that date
- **THEN** each active HealthRule with scope="day" SHALL be evaluated
- **THEN** the response SHALL include the same structure as MealEvent cockpit

#### Scenario: Meal-level cockpit
- **WHEN** a GET request is made to `/api/meals/{id}/cockpit/`
- **THEN** the system SHALL calculate nutritional values for that specific meal
- **THEN** each active HealthRule with scope="meal" SHALL be evaluated
- **THEN** the response SHALL include per-rule evaluations

#### Scenario: No meals in MealEvent
- **WHEN** the cockpit is requested for a MealEvent with no meals
- **THEN** the system SHALL return empty evaluations with current_value=0

### Requirement: Traffic light indicators in UI
The frontend SHALL display traffic-light indicators (Ampel) on all planning levels: MealEvent overview, day cards, meal cards, and recipe cards within meals.

#### Scenario: MealEvent overview with traffic lights
- **WHEN** a user views the MealEvent detail page
- **THEN** a cockpit section SHALL show traffic-light indicators for all MealEvent-scoped rules
- **THEN** each indicator SHALL display: colored dot (green/yellow/red), parameter name, current value with unit

#### Scenario: Day card with traffic lights
- **WHEN** a user views a day within the MealEvent
- **THEN** each day card SHALL show small traffic-light dots for day-scoped rules
- **THEN** hovering/clicking a dot SHALL show the rule name, current value, and tip (if yellow/red)

#### Scenario: Meal card with traffic lights
- **WHEN** a user views a meal within a day
- **THEN** the meal card SHALL show traffic-light dots for meal-scoped rules
- **THEN** the card SHALL show the primary indicators (energy, price, nutri-score) prominently

#### Scenario: Mobile responsiveness
- **WHEN** the cockpit is viewed on mobile (320px)
- **THEN** traffic lights SHALL be displayed as compact colored dots
- **THEN** detail information SHALL be accessible via tap/modal

### Requirement: Health tips display
The system SHALL display actionable tips when a traffic light is yellow or red.

#### Scenario: Tip shown for red indicator
- **WHEN** a rule evaluates to "red" on any level
- **THEN** the UI SHALL display the rule's tip_text prominently
- **THEN** the tip SHALL be styled with a red/warning background

#### Scenario: Tip shown for yellow indicator
- **WHEN** a rule evaluates to "yellow"
- **THEN** the UI SHALL display the tip_text as a suggestion (less prominent than red)

#### Scenario: No tip for green indicator
- **WHEN** a rule evaluates to "green"
- **THEN** no tip SHALL be displayed (only the green dot)

### Requirement: Cockpit summary card
The MealEvent detail page SHALL show a summary cockpit card at the top with an overall health status.

#### Scenario: Overall status calculation
- **WHEN** the cockpit summary is displayed
- **THEN** the overall status SHALL be the worst status across all rules (red > yellow > green)
- **THEN** the summary SHALL show: count of green/yellow/red rules, overall price estimate, overall nutri-class average

#### Scenario: Cockpit as tab
- **WHEN** a user views the MealEvent detail page
- **THEN** the cockpit SHALL be accessible as a tab alongside "Tagesplan", "Naehrwerte", "Einkaufsliste"
