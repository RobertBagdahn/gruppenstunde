## MODIFIED Requirements

### Requirement: Material write access restricted
The system SHALL restrict Material create, update, and delete operations to staff and admin users (`role` in `["staff", "admin"]`). Read operations (list, detail, search) SHALL remain publicly accessible without authentication.

#### Scenario: Staff creates material
- **WHEN** a staff user sends `POST /api/materials/`
- **THEN** the material SHALL be created

#### Scenario: Regular user attempts to create material
- **WHEN** a user with `role="user"` sends `POST /api/materials/`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Regular user attempts to update material
- **WHEN** a user with `role="user"` sends `PATCH /api/materials/{id}/`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Anonymous user reads materials
- **WHEN** an unauthenticated user sends `GET /api/materials/`
- **THEN** all materials SHALL be returned (read access is public)

### Requirement: MeasuringUnit, RetailSection, NutritionalTag, DgeReference write access restricted
The system SHALL restrict create, update, and delete operations on all Stammdaten models (MeasuringUnit, RetailSection, NutritionalTag, DgeReference) to staff and admin users. Read operations SHALL remain publicly accessible.

#### Scenario: Staff creates measuring unit
- **WHEN** a staff user sends `POST /api/measuring-units/`
- **THEN** the measuring unit SHALL be created

#### Scenario: Regular user attempts to create measuring unit
- **WHEN** a user with `role="user"` sends `POST /api/measuring-units/`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Anonymous user reads measuring units
- **WHEN** an unauthenticated user sends `GET /api/measuring-units/`
- **THEN** all measuring units SHALL be returned

### Requirement: Material model retains created_by/updated_by
The Material model SHALL retain `created_by` and `updated_by` fields for audit trail. These fields SHALL be `SET_NULL` on user deletion and SHALL NOT carry permission significance (permissions are role-based, not creator-based for Stammdaten).
