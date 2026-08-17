## ADDED Requirements

### Requirement: RecipeFolder Model
The system SHALL provide a RecipeFolder model with fields: name, owner FK, sort_order (int), and parent FK (self-referential, nullable for top-level folders).

#### Scenario: Maximum nesting depth
- **WHEN** a user attempts to create a folder nested more than 2 levels deep
- **THEN** the system SHALL reject the request with HTTP 422

#### Scenario: Folder ownership
- **WHEN** a folder is created
- **THEN** it SHALL be owned by the authenticated user and only visible to them

### Requirement: Recipe Folder Assignment
The Recipe model SHALL have a nullable folder FK. Only personal recipes (owner != null) MAY be assigned to folders.

#### Scenario: Assign recipe to folder
- **WHEN** a user assigns their personal recipe to a folder they own
- **THEN** the recipe SHALL be associated with that folder

#### Scenario: Community recipe cannot be in folder
- **WHEN** a recipe has no owner (community recipe)
- **THEN** it SHALL NOT be assignable to any folder

### Requirement: Recipe Folders CRUD API
The system SHALL provide CRUD endpoints at /api/recipe-folders/.

#### Scenario: List folders
- **WHEN** a user GETs /api/recipe-folders/
- **THEN** the system SHALL return all folders owned by the user in a nested tree structure

#### Scenario: Move recipe between folders
- **WHEN** a user PATCHes a recipe with a different folder_id
- **THEN** the recipe SHALL be moved to the new folder

### Requirement: Folder Filter on My Recipes
The my-recipes endpoint SHALL support filtering by folder.

#### Scenario: Filter by folder
- **WHEN** a user requests their recipes with ?folder={id}
- **THEN** only recipes in that folder SHALL be returned

#### Scenario: Filter unfiled recipes
- **WHEN** a user requests their recipes with ?folder=none
- **THEN** only recipes without a folder assignment SHALL be returned
