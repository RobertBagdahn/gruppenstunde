## ADDED Requirements

### Requirement: Group Corporate Identity data model
The system SHALL provide a `GroupCorporateIdentity` model as a OneToOneField on `UserGroup` that stores all CI-related data. The model SHALL include: `primary_color` (hex, default `#4a3a6b`), `secondary_color` (hex, default `#e8e4f0`), `logo` (ImageField, max 500KB), `slogan` (max 200 chars), `greeting_text` (TextField), `footer_text` (TextField), `payment_info` (TextField), `signature_text` (TextField).

#### Scenario: Group has no CI configured
- **WHEN** a group has no `GroupCorporateIdentity` record
- **THEN** the system SHALL use default Inspi styling (primary: `#4a3a6b`, secondary: `#e8e4f0`, no logo, empty text fields)

#### Scenario: Group has CI configured
- **WHEN** a group has a `GroupCorporateIdentity` record with custom values
- **THEN** the system SHALL use those values in all CI-aware features (emails, PDFs, registration pages)

#### Scenario: Color validation
- **WHEN** a user submits a color value that is not a valid 7-character hex color (e.g. `#abc` or `red`)
- **THEN** the system SHALL reject the input with a validation error

#### Scenario: Logo upload size validation
- **WHEN** a user uploads a logo exceeding 500KB
- **THEN** the system SHALL reject the upload with the message "Logo darf maximal 500KB groß sein"

### Requirement: CI CRUD API endpoints
The system SHALL expose API endpoints for managing a group's corporate identity. Only group admins SHALL be authorized to create, update, or delete CI data.

#### Scenario: Get CI for a group
- **WHEN** an authenticated user sends `GET /api/groups/{slug}/corporate-identity/`
- **THEN** the system SHALL return the CI data (or defaults if none configured) with status 200

#### Scenario: Create CI for a group as admin
- **WHEN** a group admin sends `PUT /api/groups/{slug}/corporate-identity/` with valid CI data
- **THEN** the system SHALL create or update the CI record and return status 200

#### Scenario: Update CI as non-admin
- **WHEN** a non-admin group member sends `PUT /api/groups/{slug}/corporate-identity/`
- **THEN** the system SHALL return status 403

#### Scenario: Upload logo
- **WHEN** a group admin sends `POST /api/groups/{slug}/corporate-identity/logo/` with an image file
- **THEN** the system SHALL store the logo via GCS and return the logo URL

#### Scenario: Delete logo
- **WHEN** a group admin sends `DELETE /api/groups/{slug}/corporate-identity/logo/`
- **THEN** the system SHALL remove the logo from the CI record

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user sends `GET /api/groups/{slug}/corporate-identity/`
- **THEN** the system SHALL return status 403

### Requirement: CI management frontend page
The system SHALL provide a frontend page at `/groups/{slug}/settings/corporate-identity` for managing the group's CI. The page SHALL be accessible only to group admins.

#### Scenario: Admin opens CI settings
- **WHEN** a group admin navigates to `/groups/{slug}/settings/corporate-identity`
- **THEN** the system SHALL display a form with color pickers (primary/secondary), logo upload, and text fields (slogan, greeting, footer, payment info, signature)

#### Scenario: Live preview
- **WHEN** the admin changes any CI field in the form
- **THEN** the system SHALL display a live preview showing how the CI will look in emails and PDFs

#### Scenario: Save CI settings
- **WHEN** the admin fills in the form and clicks "Speichern"
- **THEN** the system SHALL save the CI data via the API and show a success toast "Corporate Identity gespeichert"

#### Scenario: Non-admin access
- **WHEN** a non-admin member navigates to `/groups/{slug}/settings/corporate-identity`
- **THEN** the system SHALL redirect to the group detail page or show an unauthorized message

#### Scenario: Mobile responsiveness
- **WHEN** the admin opens the CI settings on a mobile device (320px minimum)
- **THEN** the system SHALL display the form in a single-column layout with the preview below the form

### Requirement: CI helper function for event context
The system SHALL provide a helper function `get_event_ci(event)` that resolves the corporate identity for an event. The function SHALL return the CI of the first invited group that has a CI configured, or default Inspi styling if no group has CI.

#### Scenario: Event with one invited group that has CI
- **WHEN** an event has one invited group with a configured CI
- **THEN** `get_event_ci(event)` SHALL return that group's CI data

#### Scenario: Event with no invited groups
- **WHEN** an event has no invited groups
- **THEN** `get_event_ci(event)` SHALL return default Inspi styling

#### Scenario: Event with multiple invited groups
- **WHEN** an event has multiple invited groups
- **THEN** `get_event_ci(event)` SHALL return the CI of the first group (by name, alphabetically) that has a CI configured
