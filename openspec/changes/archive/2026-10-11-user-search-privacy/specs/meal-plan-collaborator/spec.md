## MODIFIED Requirements

### Requirement: Collaborator list in meal plan detail
The system SHALL include the list of collaborators in the meal plan detail response. Each collaborator SHALL carry `display_name` (the public display name from the user directory) instead of a username; meal plan responses SHALL NOT contain e-mail addresses or usernames. The meal plan `owner_name` SHALL also be the owner's public display name.

#### Scenario: Detail includes collaborators
- **WHEN** an authenticated user with access requests `GET /api/meal-plans/{id}/`
- **THEN** the response includes a `collaborators` array with each collaborator's id, user_id, display_name, role, and created_at

#### Scenario: Owner and collaborators without a name
- **WHEN** the owner or a collaborator has neither a profile name nor an account name and their username is an e-mail address
- **THEN** `owner_name` and the collaborator `display_name` read „Inspi-Nutzer #<id>“
- **AND** the list, detail and collaborator endpoints contain no e-mail address
