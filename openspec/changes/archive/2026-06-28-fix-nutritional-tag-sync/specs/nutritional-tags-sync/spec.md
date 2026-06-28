## ADDED Requirements

### Requirement: Auto-sync nutritional tags from ingredients to recipe

The system SHALL automatically synchronize nutritional tags from a recipe's ingredients to the recipe itself. Tags SHALL be computed using AND logic (intersection): a tag MUST only appear on the recipe if ALL ingredients in the recipe share that tag.

#### Scenario: Sync sets tags when all ingredients share them
- **WHEN** a recipe has ingredients that all have the "vegan" nutritional tag
- **THEN** the recipe SHALL have the "vegan" tag in its auto-synced tags

#### Scenario: Sync removes tag when ingredient doesn't share it
- **WHEN** a recipe has ingredients where one ingredient lacks the "vegan" tag but the recipe previously had "vegan" in its auto-synced tags
- **THEN** the "vegan" tag SHALL be removed from the recipe's auto-synced tags

#### Scenario: Tag appears in response when present in either field
- **WHEN** a recipe has "vegan" in its auto-synced tags OR its manual tags
- **THEN** the API response SHALL include "vegan" in the nutritional_tags list

#### Scenario: Sync triggers on RecipeItem change
- **WHEN** a RecipeItem is created, updated, or deleted
- **THEN** the system SHALL re-sync the recipe's nutritional tags

### Requirement: Manual nutritional tag overrides

The system SHALL allow users to manually set nutritional tags on a recipe that are preserved even when ingredient changes would not include them in the intersection.

#### Scenario: Manual tags appear in response alongside auto-synced tags
- **WHEN** a user sets "vegan" as a manual tag on a recipe that contains non-vegan ingredients
- **THEN** the API response SHALL include "vegan" in the nutritional_tags list

#### Scenario: Manual tags survive ingredient changes
- **WHEN** a user manually sets "vegan" on a recipe, and then adds a non-vegan ingredient
- **THEN** the "vegan" tag SHALL remain in the recipe's nutritional_tags response

#### Scenario: Manual tags set via create API
- **WHEN** a user creates a recipe with `nutritional_tag_ids: [1, 2]`
- **THEN** tags with IDs 1 and 2 SHALL be stored as manual tags
- **AND** the recipe's auto-synced tags SHALL be computed from its ingredients

#### Scenario: Manual tags set via update API
- **WHEN** a user updates a recipe with `nutritional_tag_ids: [3]`
- **THEN** tags with ID 3 SHALL be stored as manual tags (replacing any previous manual tags)
- **AND** the recipe's auto-synced tags SHALL be re-computed from its current ingredients

### Requirement: Management command syncs all recipes

The system SHALL provide a management command to bulk-re-sync nutritional tags for all recipes, using the pure intersection logic.

#### Scenario: Management command corrects previously incorrect tags
- **WHEN** the `sync_recipe_nutritional_tags` management command is run
- **THEN** all recipes SHALL have their auto-synced tags updated to the pure intersection of their ingredients
- **AND** manual tags SHALL not be affected

#### Scenario: Dry-run mode
- **WHEN** the management command is run with `--dry-run`
- **THEN** no database changes SHALL be made
- **AND** a report of affected recipes SHALL be printed
