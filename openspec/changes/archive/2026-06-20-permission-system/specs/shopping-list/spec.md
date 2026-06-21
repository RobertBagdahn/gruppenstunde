## MODIFIED Requirements

### Requirement: ShoppingList collaborator migration to ContentCollaborator
The system SHALL migrate all shopping list collaborator records to `ContentCollaborator` with `content_type` pointing to the ShoppingList model. The shopping list API's collaborator endpoints SHALL be updated to use `ContentCollaborator`. Role-based access (`viewer`, `editor`, `admin`) SHALL remain unchanged in behavior.

#### Scenario: ShoppingList collaborator migrated
- **WHEN** the migration runs
- **THEN** all existing shopping list collaborator rows SHALL become `ContentCollaborator` rows
- **THEN** shopping list access control SHALL continue to work identically via `ContentCollaborator`

#### Scenario: Adding collaborator uses ContentCollaborator
- **WHEN** a shopping list owner adds a collaborator via API
- **THEN** a `ContentCollaborator` record SHALL be created
