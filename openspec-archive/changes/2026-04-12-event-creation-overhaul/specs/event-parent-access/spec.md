## ADDED Requirements

### Requirement: ParentAccessToken model
A new `ParentAccessToken` model SHALL be created to enable token-based parent access to event information.

#### Scenario: ParentAccessToken model fields
- **WHEN** the ParentAccessToken model is defined
- **THEN** it SHALL have the following fields:
  - `participant` — ForeignKey to Participant (on_delete=CASCADE, related_name="parent_access_tokens")
  - `token` — UUIDField (unique=True, default=uuid4, editable=False)
  - `created_at` — DateTimeField (auto_now_add=True)
  - `expires_at` — DateTimeField
  - `email` — CharField (max_length=255, blank=True)

#### Scenario: Token uniqueness
- **WHEN** a ParentAccessToken is created
- **THEN** the `token` field SHALL be globally unique (enforced by database unique constraint)

#### Scenario: Default expiration
- **WHEN** a ParentAccessToken is created without an explicit `expires_at`
- **THEN** `expires_at` SHALL default to 30 days after the associated event's `end_date`

### Requirement: Parent view page route
A public page route SHALL serve the parent view using a token, without requiring authentication.

#### Scenario: Parent view URL
- **WHEN** a parent accesses `/events/{slug}/parent/{token}`
- **THEN** the page SHALL render the parent view without requiring login
- **THEN** this SHALL be a frontend page route, NOT an API endpoint

#### Scenario: Valid token access
- **WHEN** a parent accesses the parent view with a valid, non-expired token
- **THEN** the page SHALL display the permitted information (see parent view content requirement)

#### Scenario: Expired token
- **WHEN** a parent accesses the parent view with an expired token
- **THEN** the page SHALL display an error message: "Dieser Zugangslink ist abgelaufen. Bitte wende dich an die Veranstaltungsleitung."
- **THEN** no event information SHALL be shown

#### Scenario: Invalid token
- **WHEN** a parent accesses the parent view with a token that does not exist
- **THEN** the page SHALL return a 404 Not Found page

### Requirement: Parent view API endpoint
A public API endpoint SHALL provide parent view data when given a valid token.

#### Scenario: Get parent view data
- **WHEN** GET `/api/events/{slug}/parent-view/{token}/`
- **THEN** the response SHALL return 200 OK with the permitted data fields
- **THEN** no authentication header SHALL be required

#### Scenario: Parent view data fields
- **WHEN** the parent view data is returned
- **THEN** it SHALL include ONLY the following fields:
  - `child_name` — participant's first_name and last_name
  - `event_name` — event title
  - `event_start_date` — event start date
  - `event_end_date` — event end date
  - `event_description` — event description text
  - `packing_list` — list of packing list items (if a packing list is assigned)
  - `meeting_point` — meeting point address/description (if set)
  - `location` — event location with coordinates for map display (if set)

#### Scenario: Parent view excludes sensitive data
- **WHEN** the parent view data is returned
- **THEN** it SHALL NOT include: other participants' data, payment information, admin/manager features, internal notes, or booking option details

#### Scenario: Expired token API response
- **WHEN** GET `/api/events/{slug}/parent-view/{token}/` with an expired token
- **THEN** the response SHALL return 410 Gone with message "Zugangslink abgelaufen."

#### Scenario: Invalid token API response
- **WHEN** GET `/api/events/{slug}/parent-view/{token}/` with a non-existent token
- **THEN** the response SHALL return 404 Not Found

### Requirement: Token expiration policy
ParentAccessTokens SHALL expire automatically based on the event's end date.

#### Scenario: Expiration calculation
- **WHEN** a token's `expires_at` is computed
- **THEN** it SHALL be set to `event.end_date + 30 days` at 23:59:59 UTC

#### Scenario: Expired token is rejected
- **WHEN** the current datetime is after a token's `expires_at`
- **THEN** any API request using that token SHALL be rejected
- **THEN** the parent view page SHALL show the expiration message

### Requirement: Token management API for managers
Managers SHALL be able to generate, list, and revoke parent access tokens.

#### Scenario: Generate a token for a participant
- **WHEN** POST `/api/events/{slug}/parent-tokens/` with body `{participant_id, email?}`
- **THEN** a ParentAccessToken SHALL be created for the specified participant
- **THEN** the response SHALL return 201 Created with `{id, token, participant_id, participant_name, email, created_at, expires_at, url}`
- **THEN** `url` SHALL be the full parent view URL: `/events/{slug}/parent/{token}`

#### Scenario: Generate token with email notification
- **WHEN** POST `/api/events/{slug}/parent-tokens/` with body `{participant_id, email, send_email: true}`
- **THEN** a ParentAccessToken SHALL be created
- **THEN** an email SHALL be sent to the specified address containing:
  - Subject: "Elternzugang: {event_name} – {child_name}"
  - Body: personalized link to the parent view, event name, dates, and child name

#### Scenario: Duplicate token for same participant
- **WHEN** POST `/api/events/{slug}/parent-tokens/` for a participant who already has an active (non-expired) token
- **THEN** a new token SHALL be created (multiple tokens per participant are allowed)

#### Scenario: List all tokens
- **WHEN** GET `/api/events/{slug}/parent-tokens/?page=1&page_size=20`
- **THEN** the response SHALL return paginated tokens in standard format: `{items, total, page, page_size, total_pages}`
- **THEN** each item SHALL include: `id`, `participant_name`, `email`, `created_at`, `expires_at`, `is_expired` (computed boolean)

#### Scenario: Revoke a token
- **WHEN** DELETE `/api/events/{slug}/parent-tokens/{id}/`
- **THEN** the ParentAccessToken SHALL be deleted
- **THEN** the response SHALL return 204 No Content
- **THEN** any subsequent access using that token SHALL return 404

#### Scenario: Only managers can manage tokens
- **WHEN** a non-manager attempts POST, GET, or DELETE on parent-tokens endpoints
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Batch token generation
Managers SHALL be able to generate tokens for all participants at once.

#### Scenario: Batch generate tokens
- **WHEN** POST `/api/events/{slug}/parent-tokens/batch/` with body `{send_emails: false}`
- **THEN** a ParentAccessToken SHALL be created for every participant of the event who does not yet have an active token
- **THEN** the response SHALL return 200 OK with `{created: number, skipped: number}`

#### Scenario: Batch generate with email
- **WHEN** POST `/api/events/{slug}/parent-tokens/batch/` with body `{send_emails: true}`
- **THEN** tokens SHALL be created for all participants without active tokens
- **THEN** emails SHALL be sent only to participants whose token record has a non-empty `email` field
- **THEN** the response SHALL include `{created: number, skipped: number, emails_sent: number}`

#### Scenario: Only managers can batch generate
- **WHEN** a non-manager attempts POST on `/api/events/{slug}/parent-tokens/batch/`
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Parent access UI for managers
Managers SHALL have a UI section to manage parent access tokens.

#### Scenario: Parent access section location
- **WHEN** a manager views the "Teilnehmende" tab or Settings area
- **THEN** an "Elternzugang" section or sub-tab SHALL be available

#### Scenario: Token list display
- **WHEN** a manager views the "Elternzugang" section
- **THEN** a table SHALL display all generated tokens with columns: Teilnehmer, E-Mail, Erstellt am, Gültig bis, Status (aktiv/abgelaufen), Aktionen
- **THEN** the "Aktionen" column SHALL include a "Link kopieren" button and a "Widerrufen" button

#### Scenario: Generate single token via UI
- **WHEN** a manager clicks "Token erstellen" in the parent access section
- **THEN** a dialog SHALL appear with fields: participant (select), email (optional text input), send email (checkbox labeled "E-Mail senden")
- **THEN** submitting SHALL call POST `/api/events/{slug}/parent-tokens/`

#### Scenario: Batch generate via UI
- **WHEN** a manager clicks "Alle Token erstellen" in the parent access section
- **THEN** a confirmation dialog SHALL appear: "Für alle Teilnehmer ohne aktiven Token einen Elternzugang erstellen?"
- **THEN** a checkbox "E-Mails versenden" SHALL be available in the dialog
- **THEN** confirming SHALL call POST `/api/events/{slug}/parent-tokens/batch/`

#### Scenario: Copy link to clipboard
- **WHEN** a manager clicks "Link kopieren" on a token row
- **THEN** the full parent view URL SHALL be copied to the clipboard
- **THEN** a brief toast notification "Link kopiert" SHALL be displayed

#### Scenario: Revoke token via UI
- **WHEN** a manager clicks "Widerrufen" on a token row
- **THEN** a confirmation dialog SHALL appear: "Elternzugang widerrufen? Der Link wird sofort ungültig."
- **THEN** confirming SHALL call DELETE `/api/events/{slug}/parent-tokens/{id}/`
- **THEN** the token SHALL be removed from the list
