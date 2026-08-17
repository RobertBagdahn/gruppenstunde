## MODIFIED Requirements

### Requirement: Recipe owner and visibility removed
The Recipe model SHALL NOT have `owner` or `visibility` fields. Content provenance SHALL be determined by `created_by` (`None` = Inspi-system, `User` = user-created). Sichtbarkeit SHALL be controlled by `status` (`draft` = private, `verified` = public). Group-based sharing SHALL be handled via `ContentCollaborator`.

#### Scenario: Recipe created by user
- **WHEN** an authenticated user creates a recipe via `POST /api/recipes/`
- **THEN** `created_by` SHALL be set to the user
- **THEN** `status` SHALL default to `"draft"`
- **THEN** no `owner` or `visibility` fields SHALL be set

#### Scenario: Inspi recipe identification
- **WHEN** a recipe has `created_by = None`
- **THEN** the frontend SHALL display it as system/inspi content

#### Scenario: My recipes filtered by created_by
- **WHEN** an authenticated user requests `GET /api/recipes/my-recipes/`
- **THEN** recipes where `created_by` is the user SHALL be returned (both draft and verified)

### Requirement: Recipe status simplified
The Recipe model's `status` field SHALL use only two values: `"draft"` and `"verified"`. The `"approved"` status SHALL be merged into `"verified"`. The `visibility` field SHALL be removed.

#### Scenario: Recipe created as draft
- **WHEN** a recipe is created
- **THEN** `status` SHALL be `"draft"`

#### Scenario: Staff verifies recipe
- **WHEN** a staff user sets recipe status to `"verified"`
- **THEN** the recipe SHALL become publicly visible
- **THEN** the creator SHALL lose edit permissions

#### Scenario: Recipe forking
- **WHEN** any authenticated user forks a verified recipe via `POST /api/recipes/{id}/fork/`
- **THEN** a new recipe SHALL be created with `status="draft"` and `created_by` set to the forking user
- **THEN** `forked_from` SHALL reference the source recipe

### Requirement: Recipe Folder Assignment — MODIFIED
Recipe SHALL have an optional `folder` FK for organization of personal recipes. The folder's `owner` FK to User SHALL remain (for folder ownership). Recipe filtering by folder SHALL use `created_by` instead of the removed `owner` field.

#### Scenario: Filter by folder
- **WHEN** `GET /api/recipes/my-recipes/?folder={id}` is called by the folder owner
- **THEN** only recipes in that folder where `created_by` is the user SHALL be returned
