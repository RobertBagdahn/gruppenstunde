## MODIFIED Requirements

### Requirement: Ingredient status simplified
The Ingredient model's `status` field SHALL use only two values: `"draft"` and `"verified"`. The `"user_content"` status SHALL be removed. `created_by = None` SHALL indicate Inspi-system data. `created_by = User` SHALL indicate user-created data.

#### Scenario: Ingredient created as draft
- **WHEN** an authenticated user creates an ingredient via `POST /api/ingredients/`
- **THEN** `status` SHALL be `"draft"`
- **THEN** `created_by` SHALL be set to the user

#### Scenario: Staff verifies ingredient
- **WHEN** a staff user sets ingredient status to `"verified"`
- **THEN** the ingredient SHALL become publicly visible
- **THEN** the creator SHALL lose edit permissions

#### Scenario: Inspi ingredient identified by created_by
- **WHEN** an ingredient has `created_by = None`
- **THEN** it SHALL be displayed as Inspi-system data in the frontend

### Requirement: Role-based edit permission — MODIFIED
The system SHALL restrict ingredient update and delete to:
- The creator, only when `status = "draft"`.
- Staff and admin users, regardless of status.
No other users SHALL be able to edit or delete an ingredient.

#### Scenario: Creator edits own draft ingredient
- **WHEN** the creator of a draft ingredient sends `PATCH /api/ingredients/{slug}/`
- **THEN** the update SHALL succeed

#### Scenario: Creator edits own verified ingredient
- **WHEN** the creator of a verified ingredient sends `PATCH /api/ingredients/{slug}/`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Non-creator attempts to edit any ingredient
- **WHEN** a non-staff, non-creator user sends `PATCH /api/ingredients/{slug}/`
- **THEN** the system SHALL return HTTP 403

### Requirement: Ingredient tracks creator — MODIFIED
The Ingredient model SHALL have a `created_by` field (nullable ForeignKey to User) that records which user created the ingredient. `created_by = NULL` SHALL indicate Inspi-system data.

#### Scenario: New ingredient created via API
- **WHEN** an authenticated user creates an ingredient via `POST /api/ingredients/`
- **THEN** the `created_by` field MUST be set to the authenticated user

#### Scenario: Staff creates Inspi ingredient
- **WHEN** a staff user creates an ingredient with "Als Inspi-System speichern" checked
- **THEN** `created_by` SHALL be set to `None` and `status` SHALL be `"verified"`

### Requirement: Ingredient list visibility
The ingredient list endpoint SHALL filter by visibility:
- Anonymous users SHALL only see verified ingredients.
- Authenticated users (role=user) SHALL see verified ingredients plus their own drafts.
- Staff and admin SHALL see all ingredients.

#### Scenario: Anonymous user browses ingredients
- **WHEN** an unauthenticated user requests `GET /api/ingredients/`
- **THEN** only ingredients with `status="verified"` SHALL be returned

#### Scenario: Authenticated user sees own drafts
- **WHEN** an authenticated user requests `GET /api/ingredients/`
- **THEN** verified ingredients AND ingredients where `created_by` is the user SHALL be returned

### Requirement: Portion creation restricted to ingredient creator — NEW
The system SHALL restrict portion creation, update, and deletion to the ingredient's creator (when status is `draft`) and staff/admin users. Portion permissions inherit the ingredient's lock: when an ingredient is verified, all portions become read-only for the creator.

#### Scenario: Creator adds portion to own draft ingredient
- **WHEN** the ingredient creator sends `POST /api/ingredients/{slug}/portions/`
- **THEN** the portion SHALL be created successfully

#### Scenario: Non-creator attempts to add portion
- **WHEN** a user who is not the ingredient creator sends `POST /api/ingredients/{slug}/portions/`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Creator edits portion on verified ingredient
- **WHEN** the creator attempts to update a portion on a verified ingredient
- **THEN** the system SHALL return HTTP 403

## REMOVED Requirements

### Requirement: Ingredient user_content status
**Reason**: The `user_content` status is merged into `draft`. Data provenance is now indicated by `created_by` (`None` = Inspi, `User` = user).
**Migration**: All ingredients with `status="user_content"` SHALL be set to `status="draft"`.
