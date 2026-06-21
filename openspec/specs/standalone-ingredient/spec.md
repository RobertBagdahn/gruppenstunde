### Requirement: Ingredient standalone flag
The system SHALL allow marking an Ingredient as standalone food via `is_standalone_food` boolean field (default: False).

#### Scenario: Ingredient marked as standalone
- **WHEN** an Ingredient has `is_standalone_food=True`
- **THEN** it SHALL be available for direct selection in the meal plan search

#### Scenario: Ingredient not marked as standalone
- **WHEN** an Ingredient has `is_standalone_food=False`
- **THEN** it SHALL NOT appear in meal plan search results

### Requirement: Ingredient standalone type
The system SHALL store a `standalone_type` field on Ingredient using the same choices as `RecipeTypeChoices` (breakfast, warm_meal, cold_meal, dessert, recipe_part, drink, snack, ingredient).

#### Scenario: Standalone type filtering
- **WHEN** a user filters by recipe_type in the search
- **THEN** only Ingredients with matching `standalone_type` SHALL be returned

#### Scenario: Standalone type is nullable
- **WHEN** `is_standalone_food=False`
- **THEN** `standalone_type` MAY be null

### Requirement: Standalone ingredients searchable by nutritional tags
The system SHALL filter standalone Ingredients by `nutritional_tags` when `nutritional_tag_ids` are provided in the search.

#### Scenario: Filter by vegan tag
- **WHEN** user searches with `nutritional_tag_ids=5` (vegan)
- **THEN** only standalone Ingredients that have ALL specified nutritional tags SHALL be returned
