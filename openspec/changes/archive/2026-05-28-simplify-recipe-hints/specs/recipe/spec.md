## MODIFIED Requirements

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
