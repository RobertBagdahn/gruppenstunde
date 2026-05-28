## ADDED Requirements

### Requirement: Staff can list all RecipeHints
The system SHALL display a paginated table of all RecipeHint rules at `/admin/recipe-hints`, accessible only to authenticated staff users.

#### Scenario: Staff views hint list
- **WHEN** a staff user navigates to `/admin/recipe-hints`
- **THEN** the system displays a table with columns: hint, parameter, value, min_max, hint_level, recipe_type, recipe_objective

#### Scenario: Non-staff user is denied access
- **WHEN** a non-staff user navigates to `/admin/recipe-hints`
- **THEN** the system redirects to login or shows a 403 error

### Requirement: Staff can filter RecipeHints
The system SHALL provide filter controls for parameter, hint_level, recipe_type, and recipe_objective.

#### Scenario: Filter by parameter
- **WHEN** staff selects parameter filter "weight_g"
- **THEN** only hints with parameter "weight_g" are shown

### Requirement: Staff can create a RecipeHint
The system SHALL provide a form (Sheet-Modal) to create a new RecipeHint with all required fields.

#### Scenario: Create a new hint
- **WHEN** staff fills in hint, value, min_max, hint_level, parameter, recipe_type, recipe_objective and submits
- **THEN** the system creates the hint and it appears in the table

#### Scenario: Validation error on missing required field
- **WHEN** staff submits the form without recipe_type
- **THEN** the system shows a validation error

### Requirement: Staff can edit a RecipeHint
The system SHALL allow staff to edit any existing RecipeHint via a Sheet-Modal.

#### Scenario: Edit hint text
- **WHEN** staff changes the hint field and saves
- **THEN** the updated text is persisted and shown in the table

### Requirement: Staff can delete a RecipeHint
The system SHALL allow staff to delete a RecipeHint after confirmation.

#### Scenario: Delete with confirmation
- **WHEN** staff clicks delete and confirms
- **THEN** the hint is removed from the database and table

### Requirement: CRUD API for RecipeHints
The system SHALL expose a Staff-only REST API for RecipeHint CRUD operations.

#### Scenario: List endpoint
- **WHEN** GET `/api/recipe-hints/` is called by a staff user
- **THEN** a paginated list of hints is returned

#### Scenario: Create endpoint
- **WHEN** POST `/api/recipe-hints/` with valid data by staff
- **THEN** a new hint is created and returned with 201

#### Scenario: Unauthorized access
- **WHEN** a non-staff user calls any recipe-hint CRUD endpoint
- **THEN** the system returns 403
