## MODIFIED Requirements

### Requirement: Meal plan creation
The system SHALL allow any authenticated user to create a meal plan. The creating user becomes the owner.

#### Scenario: Authenticated user creates meal plan
- **WHEN** an authenticated user sends POST `/api/meal-plans/` with valid data
- **THEN** a new meal plan is created with the user as owner

#### Scenario: Anonymous user tries to create meal plan
- **WHEN** an unauthenticated user sends POST `/api/meal-plans/`
- **THEN** the system returns 403 Forbidden

### Requirement: Meal plan list visibility
The system SHALL return only meal plans that the requesting user owns or is a collaborator on. Staff users SHALL see all meal plans.

#### Scenario: User lists their meal plans
- **WHEN** an authenticated user requests GET `/api/meal-plans/`
- **THEN** the system returns only meal plans where the user is owner or collaborator

#### Scenario: Staff lists all meal plans
- **WHEN** a staff user requests GET `/api/meal-plans/`
- **THEN** the system returns all meal plans
