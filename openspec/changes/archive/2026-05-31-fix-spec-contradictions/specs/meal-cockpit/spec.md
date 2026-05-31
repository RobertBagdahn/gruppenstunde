## MODIFIED Requirements

### Requirement: Cockpit evaluates only vitamin_c rules
The cockpit service SHALL evaluate HealthRules only for `vitamin_c_mg` as micronutrient parameter, in addition to existing macronutrient rules. The aggregation functions (`_aggregate_meal_values`, `_aggregate_day_values`) SHALL sum only `cached_vitamin_c_mg` from recipe caches.

The cockpit SHALL support the following parameters:
- Macronutrients: energy_kj, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g
- Micronutrients: vitamin_c_mg (sole micronutrient)

#### Scenario: Day cockpit evaluates vitamin_c rules
- **WHEN** the day cockpit is requested for a meal day with 3 meals
- **THEN** the system SHALL aggregate `cached_vitamin_c_mg` across all meals and evaluate against day-scope HealthRules

#### Scenario: Meal cockpit evaluates vitamin_c rules
- **WHEN** the meal cockpit is requested for a single meal
- **THEN** the system SHALL aggregate `cached_vitamin_c_mg` from all recipe items and evaluate against meal-scope HealthRules

#### Scenario: Cockpit dashboard includes vitamin_c evaluations
- **WHEN** the cockpit dashboard is built with macronutrient and vitamin_c HealthRules
- **THEN** the evaluations list SHALL include entries for vitamin_c rules alongside macronutrient rules
- **AND** the summary_status SHALL reflect the worst status across ALL active rules
