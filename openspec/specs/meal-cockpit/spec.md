## ADDED Requirements

### Requirement: HealthRule data model
The system SHALL provide a `HealthRule` model for configurable traffic-light thresholds. Each rule SHALL have: `name` (CharField), `description` (TextField), `parameter` (CharField, e.g. "energy_kj", "sugar_g", "price_total", "nutri_class"), `scope` (CharField with choices: meal_event, day, meal, recipe, ingredient), `rule_type` (CharField with choices: "max", "min", default "max"), `threshold_green` (FloatField), `threshold_yellow` (FloatField), `unit` (CharField), `tip_text` (TextField for recommendation when yellow/red), `is_active` (BooleanField, default True), `sort_order` (IntegerField).

#### Scenario: Creating a max health rule for sugar per meal
- **WHEN** an admin creates a HealthRule with rule_type="max", parameter="sugar_g", scope="meal", threshold_green=15.0, threshold_yellow=30.0
- **THEN** the rule SHALL be stored and active
- **THEN** meals with less than 15g sugar per Normportion SHALL show green
- **THEN** meals with 15-30g sugar per Normportion SHALL show yellow
- **THEN** meals with more than 30g sugar per Normportion SHALL show red

#### Scenario: Creating a min health rule for protein per day
- **WHEN** an admin creates a HealthRule with rule_type="min", parameter="protein_g", scope="day", threshold_green=50.0, threshold_yellow=30.0
- **THEN** the rule SHALL be stored and active
- **THEN** days with 50g or more protein SHALL show green
- **THEN** days with 30-50g protein SHALL show yellow
- **THEN** days with less than 30g protein SHALL show red

#### Scenario: Empty day evaluates min rules as red
- **WHEN** a day has no recipes assigned and a min-rule exists (e.g. protein_g, threshold_green=50, threshold_yellow=30)
- **THEN** the evaluation SHALL return status "red" (value 0 < threshold_yellow)

#### Scenario: Empty day evaluates max rules as green
- **WHEN** a day has no recipes assigned and a max-rule exists (e.g. sugar_g, threshold_green=25, threshold_yellow=50)
- **THEN** the evaluation SHALL return status "green" (value 0 <= threshold_green)

#### Scenario: Health rule validation
- **WHEN** a HealthRule with rule_type="max" is created with threshold_green >= threshold_yellow
- **THEN** the system SHALL reject the entry with a validation error
- **WHEN** a HealthRule with rule_type="min" is created with threshold_green <= threshold_yellow
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

### Requirement: Cockpit evaluates vitamin and mineral health rules
The cockpit service SHALL evaluate HealthRules for vitamin and mineral parameters in addition to existing macronutrient rules. The aggregation functions (`_aggregate_meal_values`, `_aggregate_day_values`) SHALL sum vitamin and mineral values from recipe caches.

The cockpit SHALL support the following additional parameters:
- Vitamins: vitamin_c_mg, vitamin_a_mg, vitamin_d_ug, vitamin_b12_ug, folate_ug
- Minerals: calcium_mg, iron_mg, magnesium_mg, zinc_mg, potassium_mg

#### Scenario: Day cockpit evaluates vitamin rules
- **WHEN** the day cockpit is requested for a meal day with 3 meals
- **THEN** the system SHALL aggregate vitamin and mineral values across all meals and evaluate them against day-scope HealthRules

#### Scenario: Meal cockpit evaluates mineral rules
- **WHEN** the meal cockpit is requested for a single meal
- **THEN** the system SHALL aggregate vitamin and mineral values from all recipe items and evaluate them against meal-scope HealthRules

#### Scenario: Cockpit dashboard includes micronutrient evaluations
- **WHEN** the cockpit dashboard is built with both macronutrient and micronutrient HealthRules
- **THEN** the evaluations list SHALL include entries for vitamin and mineral rules alongside existing macronutrient rules
- **AND** the summary_status SHALL reflect the worst status across ALL rules (including vitamin/mineral)

### Requirement: HealthRule admin interface
The HealthRule model SHALL be registered in Django admin with a comprehensive admin class:
- `list_display`: name, parameter, scope, rule_type, threshold_green, threshold_yellow, unit, is_active
- `list_filter`: scope, rule_type, parameter, is_active
- `search_fields`: name, description, tip_text
- `list_editable`: rule_type, threshold_green, threshold_yellow, is_active
- Fieldsets grouping basic info, rule type, thresholds, and display options

#### Scenario: Admin lists health rules
- **WHEN** an admin navigates to the HealthRule admin list
- **THEN** they SHALL see all rules with scope, parameter, both thresholds, and active status
- **AND** they SHALL be able to filter by scope and parameter

#### Scenario: Admin edits thresholds inline
- **WHEN** an admin changes threshold_green and threshold_yellow values in the list view
- **THEN** the changes SHALL be saved and immediately effective in cockpit evaluations
