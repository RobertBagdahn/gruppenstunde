## MODIFIED Requirements

### Requirement: Suggestion evaluation service
The system SHALL provide a `suggestion_service` that evaluates all rules and system checks for a MealPlan and returns a list of suggestions sorted by priority. Rule evaluation SHALL include active `Rule` entries for `scope="meal"`, `scope="day"`, and `scope="meal_event"` across nutrition, price, weight, and Nutri-Score parameters when those values are available from aggregations.

Planner-level rule evaluation MUST apply to all meal types in the plan. It MUST NOT skip breakfast, snack, dessert, drink, side dish, or simple meal slots merely because recipe-level rules are hidden for those recipe types.

#### Scenario: Evaluating a complete plan
- **WHEN** suggestions are requested for a fully populated MealPlan
- **THEN** the service SHALL evaluate: completeness (system), duplicates (system), budget rules, nutrition rules, price rules, weight rules, and Nutri-Score rules
- **THEN** results SHALL be sorted by priority: completeness (1) > budget (2) > nutrition (3) > duplicates (4)

#### Scenario: Evaluating an empty plan
- **WHEN** suggestions are requested for a MealPlan with no recipes assigned
- **THEN** the service SHALL return red suggestions for each empty meal slot with text "Kein Rezept zugewiesen"

#### Scenario: Evaluating all meal types
- **WHEN** a MealPlan contains breakfast, snack, dessert, drink, side dish, simple meal, warm meal, and cold meal slots with assigned items
- **THEN** the service SHALL include all of those slots in meal, day, and plan aggregations
- **THEN** matching `scope="meal"`, `scope="day"`, and `scope="meal_event"` rules SHALL be evaluated for the aggregated values

### Requirement: Suggestions API endpoint
The system SHALL provide a REST endpoint `GET /api/meal-plans/{id}/suggestions/` that returns all suggestions for a MealPlan. The endpoint SHALL include suggestions produced from system checks and active Rules for price, weight, Nutri-Score, and supported nutrition parameters. The endpoint SHALL remain accessible only to authorized owners or collaborators.

#### Scenario: Successful evaluation
- **WHEN** GET `/api/meal-plans/{id}/suggestions/` is called by an authorized user
- **THEN** the response SHALL include: suggestions (list), summary_status (worst color), red_count, yellow_count, green_count, total_count
- **THEN** suggestions generated from price, weight, Nutri-Score, and nutrition rules SHALL use the same response shape as existing nutrition suggestions

#### Scenario: Unauthorized access
- **WHEN** a user who is not owner or collaborator requests suggestions
- **THEN** the system SHALL return 403

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user requests suggestions for a MealPlan
- **THEN** the system SHALL return 403

### Requirement: Seed rules management command
The system SHALL provide a management command `seed_rules` that creates a comprehensive set of default rules based on practical scout-camp meal planning. The command SHALL be idempotent and SHALL create or update default rules without creating duplicates.

#### Scenario: Seeding day-scope rules
- **WHEN** `uv run python manage.py seed_rules` is executed
- **THEN** day-scope rules SHALL be created for energy, protein, fat, carbohydrate, fibre, sugar, saturated fat, sodium or salt, price per day, total food weight per day, and average Nutri-Score

#### Scenario: Seeding meal-scope rules
- **WHEN** `uv run python manage.py seed_rules` is executed
- **THEN** meal-scope rules SHALL be created for energy, protein, sugar, fibre, saturated fat, sodium or salt, price, total meal weight, and average Nutri-Score

#### Scenario: Seeding recipe-scope rules
- **WHEN** `uv run python manage.py seed_rules` is executed
- **THEN** recipe-scope rules SHALL be created for protein, sugar, saturated fat, sodium or salt, fibre, price, weight, energy, fat range, and Nutri-Score

#### Scenario: Seeding event-scope rules
- **WHEN** `uv run python manage.py seed_rules` is executed
- **THEN** event-scope rules SHALL be created for average daily energy, average daily protein, average daily sugar, average daily fibre, average daily price, and average Nutri-Score

#### Scenario: Idempotent execution
- **WHEN** the command is run twice
- **THEN** no duplicate rules SHALL be created

## ADDED Requirements

### Requirement: Scope-specific food quality rule set
The system SHALL support a consistent default rule set across `recipe`, `meal`, `day`, and `meal_event` scopes for practical food quality evaluation. Rules SHALL cover at least price, weight, Nutri-Score, energy, protein, sugar, fibre, saturated fat, and sodium or salt where the parameter is meaningful for that scope.

#### Scenario: Recipe and meal share comparable rules
- **WHEN** default rules are seeded
- **THEN** recipe-scope and meal-scope rules SHALL include comparable parameters for price, weight, Nutri-Score, protein, sugar, fibre, saturated fat, and sodium or salt

#### Scenario: Day and plan use aggregate rules
- **WHEN** default rules are seeded
- **THEN** day-scope and meal_event-scope rules SHALL evaluate aggregate or average values appropriate for the scope

#### Scenario: Admin can tune thresholds
- **WHEN** a staff user edits any seeded rule in the Food Admin
- **THEN** the adjusted thresholds SHALL be used by subsequent recipe or planner evaluations
