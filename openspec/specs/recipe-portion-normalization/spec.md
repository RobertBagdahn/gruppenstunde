### Requirement: All recipes MUST have servings=1
The system SHALL store all recipe quantities as per-1-portion values. The `Recipe.servings` field MUST always be `1`. All `RecipeItem.quantity` values represent the amount needed for exactly one portion.

#### Scenario: Management command normalizes existing recipes
- **WHEN** the management command `normalize_recipe_servings` is executed
- **THEN** all recipes with `servings > 1` SHALL be updated: quantities divided by `servings` where needed, and `servings` set to `1`

#### Scenario: Dry-run mode shows changes without applying
- **WHEN** the management command is executed with `--dry-run`
- **THEN** it SHALL display all planned changes without modifying the database

#### Scenario: Already-normalized recipes only update servings field
- **WHEN** a recipe has `servings > 1` but quantities are already per-1-portion (heuristic: max total weight < 200g and avg per-person weight < 30g)
- **THEN** only `servings` SHALL be set to `1`, quantities remain unchanged

#### Scenario: Total-quantity recipes get divided
- **WHEN** a recipe has `servings > 1` and quantities appear to be total amounts (per-person weights between 10-500g)
- **THEN** all `RecipeItem.quantity` values SHALL be divided by `servings`, then `servings` set to `1`

#### Scenario: Broken recipes get flagged
- **WHEN** a recipe has per-person weights exceeding 500g (indicating data corruption)
- **THEN** the command SHALL flag it for manual review and attempt AI-based estimation

#### Scenario: Cache recalculation after normalization
- **WHEN** recipe item quantities are modified
- **THEN** the recipe cache (nutrition, price) SHALL be recalculated

### Requirement: Backend API enforces servings=1
The Recipe Create and Update API endpoints SHALL always set `servings=1` on the saved recipe, regardless of the value submitted by the client.

#### Scenario: Create recipe with servings > 1
- **WHEN** a client sends a recipe create request with `servings=4`
- **THEN** the saved recipe SHALL have `servings=1`

#### Scenario: Update recipe with servings > 1
- **WHEN** a client sends a recipe update request with `servings=2`
- **THEN** the saved recipe SHALL have `servings=1`
