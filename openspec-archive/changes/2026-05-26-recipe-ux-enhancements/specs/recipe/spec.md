## MODIFIED Requirements

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
