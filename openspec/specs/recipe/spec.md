## MODIFIED Requirements

### Requirement: Cached nutrition fields on Recipe
The Recipe model SHALL cache only `cached_vitamin_c_mg` as micronutrient cache field. The fields `cached_vitamin_a_mg`, `cached_vitamin_d_ug`, `cached_vitamin_b12_ug`, `cached_calcium_mg`, `cached_iron_mg` SHALL be removed.

#### Scenario: Recipe cache recalculation
- **WHEN** `recalculate_recipe_cache` runs
- **THEN** only `cached_vitamin_c_mg` is calculated and stored as micronutrient cache (macros unaffected)

#### Scenario: Nutrition breakdown API response
- **WHEN** the nutrition breakdown endpoint is called
- **THEN** micronutrient totals include only `vitamin_c_mg`

### Requirement: Recipe Folder Assignment
Recipe SHALL have an optional folder FK for organization of personal recipes.

#### Scenario: Filter by folder
- **WHEN** GET /api/recipes/my-recipes/?folder={id} is called
- **THEN** only recipes in that folder SHALL be returned

### Requirement: Recipe Type Simple Meal
Recipe recipe_type choices SHALL include "simple_meal".

#### Scenario: Simple meal creation
- **WHEN** a recipe is created with recipe_type="simple_meal"
- **THEN** the recipe SHALL be valid without a description field

### Requirement: URL Import
Recipe SHALL support creation from external URLs.

#### Scenario: Import from URL
- **WHEN** POST /api/recipes/import-from-url/ is called with a valid recipe URL
- **THEN** a preview of the parsed recipe data SHALL be returned

### Requirement: RecipeHint model structure
The RecipeHint model SHALL have the following fields: `name` (CharField), `description` (TextField, optional), `improvement_text` (TextField, optional), `hint` (CharField, displayed text), `value` (FloatField, threshold), `min_max` (CharField, "min"|"max"), `hint_level` (CharField, "info"|"warn"|"error"), `parameter` (CharField, choices from HintParameterChoices), `recipe_type` (CharField, required), `recipe_objective` (CharField, required).

#### Scenario: Minimum rule triggers
- **WHEN** a recipe's computed parameter value is below a hint's `value` where `min_max` = "min"
- **THEN** the hint is matched and returned in improvement results

#### Scenario: Maximum rule triggers
- **WHEN** a recipe's computed parameter value is above a hint's `value` where `min_max` = "max"
- **THEN** the hint is matched and returned in improvement results

#### Scenario: Required fields enforced
- **WHEN** a RecipeHint is created without `recipe_type` or `recipe_objective`
- **THEN** validation fails

### Requirement: Hint level visual differentiation in frontend
The frontend SHALL visually distinguish hint_level in RecipeImprovement cards using color coding.

#### Scenario: Warning level display
- **WHEN** a matched hint has `hint_level` = "warn"
- **THEN** the improvement card uses amber/orange styling (border and progress bar)

#### Scenario: Error level display
- **WHEN** a matched hint has `hint_level` = "error"
- **THEN** the improvement card uses red styling (border and progress bar)

#### Scenario: Info level display
- **WHEN** a matched hint has `hint_level` = "info"
- **THEN** the improvement card uses blue/gray styling

### Requirement: Hint text displayed as recommendation
The frontend SHALL display the `hint` field text as the recommendation text in improvement cards.

#### Scenario: Hint text shown
- **WHEN** a RecipeHint matches a recipe
- **THEN** the `hint` value (e.g. "viel mehr Gewicht") is displayed as the recommendation text in the improvement card
