## ADDED Requirements

### Requirement: Collaborator management for meal plans
The system SHALL allow meal plan owners to add, update, and remove collaborators on their meal plans. Each collaborator SHALL have a role of viewer, editor, or admin.

#### Scenario: Owner adds a collaborator
- **WHEN** the meal plan owner adds a user as collaborator with role "editor"
- **THEN** the user is linked to the meal plan with the editor role and can access it

#### Scenario: Owner changes collaborator role
- **WHEN** the meal plan owner changes a collaborator's role from "viewer" to "editor"
- **THEN** the collaborator's permissions are updated immediately

#### Scenario: Owner removes a collaborator
- **WHEN** the meal plan owner removes a collaborator
- **THEN** the user can no longer access the meal plan

#### Scenario: Duplicate collaborator prevented
- **WHEN** the owner tries to add a user who is already a collaborator
- **THEN** the system returns an error (409 Conflict)

### Requirement: Role-based access control for meal plans
The system SHALL enforce permissions based on collaborator role: viewers can only read, editors can modify meals/items, admins can manage collaborators and delete the plan.

#### Scenario: Viewer tries to edit
- **WHEN** a collaborator with role "viewer" attempts to modify the meal plan
- **THEN** the system returns 403 Forbidden

#### Scenario: Editor modifies meals
- **WHEN** a collaborator with role "editor" adds or removes meals/items
- **THEN** the changes are saved successfully

#### Scenario: Admin manages collaborators
- **WHEN** a collaborator with role "admin" adds another collaborator
- **THEN** the new collaborator is added successfully

### Requirement: API endpoints for meal plan collaborators
The system SHALL provide CRUD endpoints at `/api/meal-plans/{id}/collaborators/`.

#### Scenario: List collaborators
- **WHEN** an authenticated user with access to the meal plan requests GET `/api/meal-plans/{id}/collaborators/`
- **THEN** the system returns a list of all collaborators with their roles

#### Scenario: Add collaborator
- **WHEN** an owner or admin sends POST `/api/meal-plans/{id}/collaborators/` with user_id and role
- **THEN** the collaborator is created and returned with 201 status

### Requirement: Owner distinction in meal plan response
The system SHALL expose whether the current user is the owner of a meal plan via an `is_owner` boolean field in both list and detail responses.

#### Scenario: Owner sees is_owner=true
- **WHEN** the user who created the meal plan requests `GET /api/meal-plans/{id}/`
- **THEN** the response includes `is_owner: true`

#### Scenario: Collaborator sees is_owner=false
- **WHEN** a collaborator (any role) who is not the creator requests `GET /api/meal-plans/{id}/`
- **THEN** the response includes `is_owner: false`

### Requirement: Collaborator list in meal plan detail
The system SHALL include the list of collaborators in the meal plan detail response.

#### Scenario: Detail includes collaborators
- **WHEN** an authenticated user with access requests `GET /api/meal-plans/{id}/`
- **THEN** the response includes a `collaborators` array with each collaborator's id, user_id, username, role, and created_at

### Requirement: Collaborator count in meal plan list
The system SHALL include the collaborator count in the meal plan list response.

#### Scenario: List includes collaborator count
- **WHEN** an authenticated user requests the meal plan list
- **THEN** each meal plan object includes a `collaborators_count` integer field
