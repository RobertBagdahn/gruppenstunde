## MODIFIED Requirements

### Requirement: Central food access policy
The backend SHALL evaluate Food read, edit, delete, fork, and export access through one central policy. Delete access SHALL NOT be derived from edit access for collaborator roles: a `ContentCollaborator` with role `editor` SHALL be able to edit but SHALL NOT be able to delete shared Food content. Only the owner, a collaborator with role `admin`, or Staff SHALL delete shared content.

#### Scenario: Editor collaborator cannot delete shared Recipe
- **WHEN** a collaborator with role `editor` attempts to delete a shared Recipe
- **THEN** the API SHALL return HTTP 403 and SHALL not delete the Recipe

#### Scenario: Owner can delete shared Recipe
- **WHEN** the owner deletes a Recipe shared with others
- **THEN** the API SHALL delete the Recipe

#### Scenario: Admin collaborator can delete
- **WHEN** a collaborator with role `admin` deletes the shared Recipe
- **THEN** the API SHALL delete the Recipe
