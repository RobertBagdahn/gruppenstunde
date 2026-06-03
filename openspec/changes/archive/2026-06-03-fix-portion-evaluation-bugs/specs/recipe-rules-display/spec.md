## ADDED Requirements

### Requirement: Portion-based evaluation of recipe rules
The system SHALL evaluate all recipe-scope rules based on the portion size (serving size) of the recipe, except for `nutri_class` and `weight_g` which MUST remain unscaled.

#### Scenario: Recipe rule evaluation scales nutrient values to serving size
- **WHEN** a recipe has a total weight of 1000g and servings of 4 (factor = 2.5)
- **AND** the recipe's protein content is 15.0g per 100g (37.5g per serving)
- **AND** a rule "protein_g >= 30" (scope="recipe") is active
- **THEN** the rule evaluation SHALL evaluate the serving value (37.5g) against the threshold and return status "green"

#### Scenario: Recipe rule evaluation does not scale nutri_class or weight_g
- **WHEN** a recipe has a total weight of 800g and servings of 2 (factor = 4.0)
- **AND** the recipe's cached nutri_class is 2 (B)
- **AND** a rule "nutri_class <= 2" (scope="recipe") is active
- **THEN** the rule evaluation SHALL evaluate the raw nutri_class value (2) and return status "green"
- **AND** the display_value SHALL be correctly mapped to "B"
