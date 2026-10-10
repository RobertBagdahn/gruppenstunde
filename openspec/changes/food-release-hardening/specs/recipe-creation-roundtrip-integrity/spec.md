## ADDED Requirements

### Requirement: Portionless direct-gram RecipeItems remain safe
RecipeItems with no Portion SHALL remain valid when quantity represents grams. Embedding generation and recipe response construction SHALL handle these rows without aborting the recipe operation or losing an available ingredient name.

#### Scenario: Recipe contains a direct-gram item
- **WHEN** a recipe contains a RecipeItem whose Portion is null
- **THEN** embedding generation SHALL skip or safely represent that row without raising an exception
- **THEN** the recipe operation SHALL continue for the remaining valid items
- **THEN** the frontend SHALL show the persisted ingredient name when one is available
