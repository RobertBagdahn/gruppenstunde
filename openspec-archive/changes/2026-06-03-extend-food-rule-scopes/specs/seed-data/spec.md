## MODIFIED Requirements

### Requirement: Seed data includes comprehensive nutrition rules

The seed commands SHALL seed comprehensive food rules for the unified `Rule` model. Seeded rules SHALL cover recipe, meal, day, and meal_event scopes and SHALL include practical thresholds for nutrition, price, weight, and Nutri-Score.

The default rule set SHALL include:

**Recipe rules:**
- Macronutrients and quality rules for energy, protein, fat, saturated fat, sugar, sodium or salt, fibre, weight, price, and `nutri_class`
- Recipe-scope rules SHALL be intended only for recipes with `recipe_type="warm_meal"` or `recipe_type="cold_meal"`
- Every rule SHALL have a non-empty German `tip_text` and, where useful, `improvement_text`

**Meal rules:**
- Rules for energy, protein, sugar, fibre, saturated fat, sodium or salt, price, total food weight, and average `nutri_class`
- Meal-scope rules SHALL apply to all meal types in the planner

**Day rules:**
- Rules for daily energy, protein, fat, carbohydrate, fibre, sugar, saturated fat, sodium or salt, total price, total food weight, and average `nutri_class`

**Meal event rules:**
- Rules for average daily energy, protein, sugar, fibre, price, and average `nutri_class` across the whole MealPlan

**DgeReference entries:**
- 10 age groups x 2 genders
- All macronutrient reference values from the existing DGE reference data
- All supported vitamin and mineral reference values

#### Scenario: Seed creates recipe rules
- **WHEN** `uv run python manage.py seed_rules` or `uv run python manage.py seed_all` is executed
- **THEN** recipe-scope Rule objects SHALL be created for energy, protein, fat, saturated fat, sugar, sodium or salt, fibre, weight, price, and `nutri_class`
- **THEN** each recipe-scope rule SHALL include a German `tip_text`

#### Scenario: Seed creates meal rules
- **WHEN** `uv run python manage.py seed_rules` or `uv run python manage.py seed_all` is executed
- **THEN** meal-scope Rule objects SHALL be created for energy, protein, sugar, fibre, saturated fat, sodium or salt, price, weight, and `nutri_class`

#### Scenario: Seed creates day and event rules
- **WHEN** `uv run python manage.py seed_rules` or `uv run python manage.py seed_all` is executed
- **THEN** day-scope and meal_event-scope Rule objects SHALL be created for aggregate nutrition quality, price, weight where meaningful, and average Nutri-Score

#### Scenario: Seed creates DGE references
- **WHEN** `uv run python manage.py seed_all` is executed
- **THEN** 20 DgeReference objects SHALL be created (10 age groups x 2 genders)
- **AND** each entry SHALL have supported vitamin and mineral reference values populated

#### Scenario: Seed is idempotent
- **WHEN** `uv run python manage.py seed_rules` or `uv run python manage.py seed_all` is executed twice
- **THEN** no duplicate Rule or DgeReference objects SHALL be created

#### Scenario: Existing user-edited rules
- **WHEN** a seeded rule already exists and has been edited by an admin
- **THEN** the seeding behavior SHALL avoid creating duplicates and SHOULD avoid overwriting intentional admin customizations unless a clear update strategy is implemented
