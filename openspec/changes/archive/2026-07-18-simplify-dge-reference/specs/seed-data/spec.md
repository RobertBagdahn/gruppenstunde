## MODIFIED Requirements

### Requirement: Seed data for rules (meal planner)

The seed command `seed_all` SHALL create rules (Rule objects) for recipe, meal, day, and meal_event scopes with sensible defaults for energy, protein, fat, saturated fat, sugar, sodium or salt, fibre, weight, price, and Nutri-Score. The seeding SHALL be idempotent for rules — repeated runs SHALL NOT create duplicates and SHALL NOT overwrite admin-customized rules.

**Note**: DgeReference database objects are NOT seeded. DGE reference values are exclusively managed as static data in `supply/data/dge_reference.py`.

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

#### Scenario: Seed is idempotent
- **WHEN** `uv run python manage.py seed_rules` or `uv run python manage.py seed_all` is executed twice
- **THEN** no duplicate Rule objects SHALL be created

#### Scenario: Existing user-edited rules
- **WHEN** a seeded rule already exists and has been edited by an admin
- **THEN** the seeding behavior SHALL avoid creating duplicates and SHOULD avoid overwriting intentional admin customizations unless a clear update strategy is implemented

## REMOVED Requirements

### Requirement: DgeReference seed data

**Reason**: The `DgeReference` database model is removed (see `extended-nutrition-rules` delta spec). DGE reference values are exclusively managed as static data in `supply/data/dge_reference.py` — no database seeding is needed.

**Migration**: The `seed_all` command no longer creates DgeReference objects. The commented-out DgeReference seed code SHALL be removed from `seed_all.py`. The static data in `supply/data/dge_reference.py` serves as the canonical DGE reference.
