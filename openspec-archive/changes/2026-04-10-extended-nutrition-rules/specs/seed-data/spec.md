## MODIFIED Requirements

### Requirement: Seed data includes comprehensive nutrition rules
The `seed_all.py` command SHALL seed comprehensive nutrition rules. The seed data SHALL include:

**RecipeHints (50+ rules):**
- All macronutrient rules from the old Inspi project (20+ rules for energy, protein, fat, fat_sat, sugar, salt, sodium, fibre, weight, nutri_class)
- New vitamin rules (6 rules for vitamin_c, vitamin_a, vitamin_d, vitamin_b12, folate)
- New mineral rules (7 rules for calcium, iron, magnesium, zinc, potassium)
- Type-specific rules for breakfast (3), snack (3), and drink (2)
- Every rule SHALL have a non-empty `improvement_text` in German

**HealthRules (20+ rules):**
- Existing 6 rules (sugar/day, energy/day, costs/day, nutri-score/event, sugar/meal, energy/meal)
- New day-scope rules: vitamin_c, calcium, iron, fibre, protein, fat, salt, vitamin_a, folate, magnesium, potassium, zinc (12 rules)
- New meal-scope rules: vitamin_c, fibre, salt (3 rules)
- Every rule SHALL have a non-empty `tip_text` in German

**DgeReference entries (20 entries):**
- 10 age groups x 2 genders
- All macronutrient reference values (from existing dge_reference.py)
- All vitamin reference values (from official DGE D-A-CH tables)
- All mineral reference values (from official DGE D-A-CH tables)

#### Scenario: Seed creates all RecipeHints
- **WHEN** `uv run python manage.py seed_all` is executed
- **THEN** at least 50 RecipeHint objects SHALL be created with populated name, parameter, hint_level, recipe_objective, and improvement_text fields

#### Scenario: Seed creates all HealthRules
- **WHEN** `uv run python manage.py seed_all` is executed
- **THEN** at least 20 HealthRule objects SHALL be created with populated tip_text fields

#### Scenario: Seed creates DGE references
- **WHEN** `uv run python manage.py seed_all` is executed
- **THEN** 20 DgeReference objects SHALL be created (10 age groups x 2 genders)
- **AND** each entry SHALL have vitamin and mineral reference values populated

#### Scenario: Seed is idempotent
- **WHEN** `uv run python manage.py seed_all` is executed twice
- **THEN** no duplicate RecipeHint, HealthRule, or DgeReference objects SHALL be created
