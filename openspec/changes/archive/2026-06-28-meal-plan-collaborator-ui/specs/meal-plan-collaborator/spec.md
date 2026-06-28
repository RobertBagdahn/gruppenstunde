## ADDED Requirements

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
