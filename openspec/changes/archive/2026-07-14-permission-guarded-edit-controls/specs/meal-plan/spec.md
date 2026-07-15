## ADDED Requirements

### Requirement: List schema exposes can_edit and can_delete
The meal plan list item response schema SHALL include `can_edit: bool` and `can_delete: bool` fields in addition to the existing `is_owner` field. Values SHALL be resolved server-side based on the user's relationship to the meal plan (ownership, collaborator role, staff status).

#### Scenario: Meal plan list includes permission fields
- **WHEN** a client fetches `GET /api/meal-plans/`
- **THEN** each item in the response MUST include `can_edit` and `can_delete`
- **THEN** `can_edit` SHALL be `true` for plans the user can edit
- **THEN** `can_delete` SHALL be `true` for plans the user can delete
- **THEN** the existing `is_owner` field SHALL remain unchanged

### Requirement: List page guards actions with permissions
The meal plan list page SHALL only show destructive or privileged actions in the card dropdown menu when the user has the appropriate permission. The dropdown menu items "Löschen" and "Als Vorlage verwenden" SHALL be hidden when the user lacks permission.

#### Scenario: Owner views their plan card
- **WHEN** the plan owner views the meal plan list
- **THEN** the three-dot dropdown menu SHALL show "Als Vorlage verwenden" and "Löschen"

#### Scenario: Non-owner views another's plan card
- **WHEN** a non-owner user views the meal plan list
- **THEN** the three-dot dropdown menu SHALL NOT show "Löschen"
- **THEN** the three-dot dropdown menu SHALL NOT show "Als Vorlage verwenden" (unless they have editor/collaborator access)
