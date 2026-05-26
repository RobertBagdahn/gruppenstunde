## MODIFIED Requirements

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
- `list_display`: name, parameter, scope, threshold_green, threshold_yellow, unit, is_active
- `list_filter`: scope, parameter, is_active
- `search_fields`: name, description, tip_text
- `list_editable`: threshold_green, threshold_yellow, is_active
- Fieldsets grouping basic info, thresholds, and display options

#### Scenario: Admin lists health rules
- **WHEN** an admin navigates to the HealthRule admin list
- **THEN** they SHALL see all rules with scope, parameter, both thresholds, and active status
- **AND** they SHALL be able to filter by scope and parameter

#### Scenario: Admin edits thresholds inline
- **WHEN** an admin changes threshold_green and threshold_yellow values in the list view
- **THEN** the changes SHALL be saved and immediately effective in cockpit evaluations
