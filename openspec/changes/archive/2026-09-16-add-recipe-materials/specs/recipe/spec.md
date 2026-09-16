## ADDED Requirements

### Requirement: Recipe-specific relations
Recipes SHALL expose ingredients, materials and equipment as separate relations in detail and edit contracts.

#### Scenario: Detail response
- **WHEN** a recipe contains a food ingredient, a material and equipment
- **THEN** the recipe detail response SHALL return each in its respective field

#### Scenario: Edit payload
- **WHEN** an authorized user updates recipe materials
- **THEN** only material links SHALL change
- **THEN** RecipeItems and Equipment SHALL remain unchanged unless explicitly edited through their own operations
