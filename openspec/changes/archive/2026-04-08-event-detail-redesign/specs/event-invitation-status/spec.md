## ADDED Requirements

### Requirement: Invitation status list API
The system SHALL provide an API endpoint to list all invited users with their response status.

#### Scenario: List invitations for an event
- **WHEN** GET `/api/events/{slug}/invitations/`
- **AND** the requesting user is a manager
- **THEN** the response SHALL be a paginated list of invited users
- **THEN** each entry SHALL include: `user_id`, `first_name`, `last_name`, `email`, `scout_name`, `status` (accepted/pending), `invited_via` (direct/group), `group_name` (if invited via group)
- **THEN** the response SHALL use standard pagination format: `{ items, total, page, page_size, total_pages }`

#### Scenario: Status determination
- **WHEN** the system determines a user's invitation status
- **AND** the user has a Registration record for this event
- **THEN** the status SHALL be `accepted`
- **WHEN** the user does NOT have a Registration record
- **THEN** the status SHALL be `pending`

#### Scenario: Filter by status
- **WHEN** GET `/api/events/{slug}/invitations/?status=accepted`
- **THEN** only users with status `accepted` SHALL be returned
- **WHEN** GET `/api/events/{slug}/invitations/?status=pending`
- **THEN** only users with status `pending` SHALL be returned

#### Scenario: Search invitations
- **WHEN** GET `/api/events/{slug}/invitations/?search=Max`
- **THEN** the response SHALL filter by first_name, last_name, scout_name, or email

#### Scenario: Non-manager access
- **WHEN** a non-manager user requests GET `/api/events/{slug}/invitations/`
- **THEN** the system SHALL return HTTP 403

### Requirement: Invitation status frontend view
The frontend SHALL display the invitation status list in the admin "Eingeladene" tab.

#### Scenario: Invitations tab displays all invited users
- **WHEN** a manager views the "Eingeladene" tab
- **THEN** a list of all invited users SHALL be displayed
- **THEN** each entry SHALL show: name, email, status badge (color-coded), invited via (direct or group name)
- **THEN** status badges SHALL use: green for "Zugesagt", gray for "Offen"

#### Scenario: Filter by status
- **WHEN** the manager selects a status filter
- **THEN** the list SHALL filter to show only users with the selected status
- **THEN** filter buttons SHALL show counts: "Alle (25)", "Zugesagt (15)", "Offen (10)"

#### Scenario: Search in invitations
- **WHEN** the manager types in the search field
- **THEN** the list SHALL filter by name or email in real-time

### Requirement: Invitation count in event detail
The event detail API SHALL include invitation status counts.

#### Scenario: Counts in event detail
- **WHEN** GET `/api/events/{slug}/` by a manager
- **THEN** the response SHALL include `invitation_counts`: `{ total, accepted, pending }`
- **WHEN** the requesting user is a member (not manager)
- **THEN** `invitation_counts` SHALL NOT be included in the response
