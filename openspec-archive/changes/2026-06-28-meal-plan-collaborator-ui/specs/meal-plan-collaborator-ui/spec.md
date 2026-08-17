## ADDED Requirements

### Requirement: Meal plan share button
The system SHALL display a "Teilen" button in the action bar of the meal plan detail page, visible only to the plan owner.

#### Scenario: Owner sees share button
- **WHEN** the meal plan owner views the meal plan detail page
- **THEN** a "Teilen" button is displayed next to "Kochplan" and "Drucken"

#### Scenario: Non-owner does not see share button
- **WHEN** a collaborator with role "editor" or "viewer" views the meal plan detail page
- **THEN** no "Teilen" button is displayed

### Requirement: Meal plan collaborator management
The system SHALL allow meal plan owners to view, add, update roles, and remove collaborators via a dedicated UI.

#### Scenario: Owner opens collaborator management
- **WHEN** the owner clicks the "Teilen" button
- **THEN** a dialog opens showing the current list of collaborators with their roles, an "Einladen" form, and remove buttons

#### Scenario: Owner adds a collaborator
- **WHEN** the owner selects a user via the search dropdown, picks a role, and clicks "Einladen"
- **THEN** the user is added as a collaborator, the list updates, and the invited user receives an email notification

#### Scenario: Owner changes a collaborator role
- **WHEN** the owner changes a collaborator's role from "viewer" to "editor" via the role dropdown
- **THEN** the role is updated immediately and the change is reflected in the UI

#### Scenario: Owner removes a collaborator
- **WHEN** the owner clicks the remove button next to a collaborator and confirms
- **THEN** the collaborator is removed and immediately loses access to the meal plan

### Requirement: Collaborator email notification
The system SHALL send an email notification to a user when they are added as a collaborator to a meal plan.

#### Scenario: Email sent on add
- **WHEN** an owner adds a user as a collaborator via `POST /api/meal-plans/{id}/collaborators/`
- **THEN** the system sends an email to the user's email address with plan name, inviter name, and assigned role

#### Scenario: Email not sent on role update
- **WHEN** an owner changes an existing collaborator's role via `PATCH`
- **THEN** no email notification is sent

### Requirement: Collaborator count in meal plan list
The system SHALL display the number of collaborators in the meal plan list view.

#### Scenario: Collaborator count shown
- **WHEN** a meal plan has 3 collaborators
- **THEN** the meal plan card in the list view displays "3 Mitglieder" or similar indicator

### Requirement: Owner indicator in meal plan detail
The system SHALL indicate whether the current user is the owner of a meal plan, distinct from having edit permissions.

#### Scenario: Owner sees "Mein Plan" badge
- **WHEN** the owner views the meal plan detail page
- **THEN** a "Mein Plan" or owner indicator is displayed in the header area

#### Scenario: Editor sees collaborator role
- **WHEN** a collaborator with role "editor" views the meal plan detail page
- **THEN** they see they are a "Bearbeiter" (not owner), with the same `can_edit` capabilities
