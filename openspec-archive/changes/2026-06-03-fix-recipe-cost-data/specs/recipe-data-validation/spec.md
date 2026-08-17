## ADDED Requirements

### Requirement: Validate recipe data for unrealistic quantities
The system SHALL provide a management command `validate_recipe_data` that identifies recipes with unrealistic ingredient quantities based on per-person weight heuristics.

#### Scenario: Detect unrealistic oil quantity
- **WHEN** a recipe has `servings=1` and an ingredient with `quantity * portion.weight_g > 5000g`
- **THEN** the command SHALL flag this recipe as having unrealistic data and report the ingredient name, current quantity, and calculated per-person weight

#### Scenario: Dry-run mode (default)
- **WHEN** the command runs without `--fix` flag
- **THEN** it SHALL only report problems without modifying any data

#### Scenario: Fix mode corrects servings
- **WHEN** the command runs with `--fix` flag and a recipe has `servings=1` with total ingredient weight > 5kg
- **THEN** it SHALL estimate correct `servings` based on total recipe weight and update the field

#### Scenario: Fix mode logs all changes
- **WHEN** the command runs with `--fix` flag and modifies data
- **THEN** it SHALL log each change with recipe ID, field, old value, and new value

### Requirement: Command works on any database
The command SHALL connect to whatever database is configured in Django settings, enabling execution on both local and production databases.

#### Scenario: Run on production via Cloud Run Job
- **WHEN** the command is deployed as a Cloud Run Job with production DATABASE_URL
- **THEN** it SHALL execute against the production database and output results to stdout
