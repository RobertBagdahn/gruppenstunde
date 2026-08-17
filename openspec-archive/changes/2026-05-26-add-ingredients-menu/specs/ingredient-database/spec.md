## ADDED Requirements

### Requirement: Ingredient tracks creator
The Ingredient model SHALL have a `created_by` field (nullable ForeignKey to User) that records which user created the ingredient.

#### Scenario: New ingredient is created via API
- **WHEN** an authenticated user creates an ingredient via `POST /api/ingredients/`
- **THEN** the `created_by` field MUST be set to the authenticated user

#### Scenario: Existing ingredients without creator
- **WHEN** an ingredient has `created_by = NULL`
- **THEN** only staff users SHALL be able to edit or delete it

### Requirement: Role-based edit permission
The system SHALL restrict ingredient update and delete to users who are either the creator or have `is_staff=True`.

#### Scenario: Creator edits their ingredient
- **WHEN** the creator of an ingredient sends `PUT /api/ingredients/{slug}/`
- **THEN** the system MUST allow the update

#### Scenario: Staff edits any ingredient
- **WHEN** a staff user sends `PUT /api/ingredients/{slug}/`
- **THEN** the system MUST allow the update

#### Scenario: Non-creator non-staff attempts edit
- **WHEN** a user who is neither creator nor staff sends `PUT /api/ingredients/{slug}/`
- **THEN** the system MUST return HTTP 403

#### Scenario: Non-creator non-staff attempts delete
- **WHEN** a user who is neither creator nor staff sends `DELETE /api/ingredients/{slug}/`
- **THEN** the system MUST return HTTP 403

### Requirement: Frontend edit visibility
The frontend SHALL only show edit/delete controls when the current user is the ingredient creator or has staff status.

#### Scenario: Creator views their ingredient detail
- **WHEN** the ingredient creator views `/ingredients/:slug`
- **THEN** edit and delete buttons MUST be visible

#### Scenario: Regular user views another user's ingredient
- **WHEN** a non-staff user who is not the creator views `/ingredients/:slug`
- **THEN** edit and delete buttons MUST NOT be visible

### Requirement: API exposes created_by_id
The ingredient API response schema SHALL include `created_by_id: int | null`.

#### Scenario: Ingredient detail response
- **WHEN** a client fetches `GET /api/ingredients/{slug}/`
- **THEN** the response MUST include `created_by_id` (integer or null)
