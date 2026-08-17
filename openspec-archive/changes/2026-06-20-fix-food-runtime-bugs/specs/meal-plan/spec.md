## MODIFIED Requirements

### Requirement: Rule scope for meal plan evaluation
Rules with scope targeting a meal plan SHALL use the internal value `"meal_plan"` (renamed from `"meal_event"`). The German display label SHALL remain `"Essensplan"`.

#### Scenario: Rule scope value for meal plan
- **WHEN** a Rule targets a meal plan (e.g., total energy per plan)
- **THEN** the `scope` field SHALL be `"meal_plan"` with display label `"Essensplan"`

#### Scenario: Cockpit evaluates meal plan rules
- **WHEN** the cockpit service evaluates rules at the meal plan level
- **THEN** it SHALL filter rules with `scope="meal_plan"` and aggregate nutritional values across all meals in the plan

### Requirement: Meal foreign key column naming
The `Meal.meal_plan` foreign key SHALL use the database column name `meal_plan_id` (renamed from `meal_event_id`) to match the Django field name.

#### Scenario: Database column matches field name
- **WHEN** the `Meal` model's `meal_plan` field is inspected
- **THEN** the database column SHALL be `meal_plan_id`
