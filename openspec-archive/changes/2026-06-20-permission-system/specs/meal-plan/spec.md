## MODIFIED Requirements

### Requirement: Meal plan visibility simplified
The MealPlan model's `visibility` field SHALL be removed. Sichtbarkeit SHALL be controlled by:
- `status = "draft"`: visible to creator, collaborators, and staff/admin only.
- `status = "verified"`: visible to all authenticated users (and anonymous where applicable).
Group-based sharing SHALL be handled via `ContentCollaborator`.

#### Scenario: Draft meal plan hidden from non-collaborators
- **WHEN** a user who is not the creator or a collaborator requests a draft meal plan
- **THEN** the system SHALL return HTTP 404

#### Scenario: Verified meal plan visible
- **WHEN** any authenticated user requests a verified meal plan
- **THEN** the meal plan SHALL be returned

### Requirement: Meal plan status field added
The MealPlan model SHALL have a `status` field with choices `"draft"` and `"verified"`. Default SHALL be `"draft"`. Staff and admin SHALL be able to transition to `"verified"`.

#### Scenario: Meal plan created as draft
- **WHEN** an authenticated user creates a meal plan via `POST /api/meal-plans/`
- **THEN** `status` SHALL be `"draft"`

#### Scenario: Staff verifies meal plan
- **WHEN** a staff user sets meal plan status to `"verified"`
- **THEN** the meal plan SHALL become publicly visible to all authenticated users
- **THEN** collaborators SHALL lose edit permissions (verified content is staff-edit-only)

### Requirement: Meal plan creation — MODIFIED
The system SHALL allow any authenticated user to create a meal plan. The creating user becomes the `created_by` user. The MealPlan SHALL support an optional `budget_per_person_per_day` field (DecimalField, nullable). The `owner` field SHALL remain, auto-set to `created_by` on creation.

#### Scenario: Authenticated user creates meal plan
- **WHEN** an authenticated user sends `POST /api/meal-plans/` with valid data
- **THEN** a new meal plan is created with `created_by` and `owner` set to the user
- **THEN** `status` SHALL be `"draft"`

### Requirement: Collaborator management for meal plans — MODIFIED
The system SHALL use `ContentCollaborator` instead of `MealPlanCollaborator` for meal plan sharing. The existing API endpoints at `/api/meal-plans/{id}/collaborators/` SHALL be updated to query and manipulate `ContentCollaborator` records. The `MealPlanCollaborator` model SHALL be removed after data migration.

#### Scenario: List collaborators uses ContentCollaborator
- **WHEN** an authenticated user requests `GET /api/meal-plans/{id}/collaborators/`
- **THEN** ContentCollaborator records for the meal plan SHALL be returned

#### Scenario: Collaborator edit permissions overridden by verified status
- **WHEN** a meal plan is verified
- **THEN** collaborators with editor/admin role SHALL lose edit permissions
- **THEN** only staff/admin SHALL be able to edit the verified meal plan

### Requirement: Meal plan list visibility
The meal plan list endpoint SHALL filter by visibility:
- Authenticated users (role=user) SHALL see: own meal plans + meal plans where they are a collaborator + verified meal plans.
- Staff and admin SHALL see all meal plans.

#### Scenario: User sees own and collaborator meal plans
- **WHEN** an authenticated user requests `GET /api/meal-plans/`
- **THEN** meal plans where `created_by` is the user, where the user is a collaborator, or where `status="verified"` SHALL be returned

#### Scenario: Staff sees all meal plans
- **WHEN** a staff user requests `GET /api/meal-plans/`
- **THEN** all meal plans regardless of status or creator SHALL be returned
