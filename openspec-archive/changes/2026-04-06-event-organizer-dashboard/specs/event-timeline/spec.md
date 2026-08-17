## ADDED Requirements

### Requirement: Timeline Entry Model
The system SHALL store a `TimelineEntry` for every significant action related to an event's participants. Each entry SHALL contain: event (FK), participant (FK, nullable), user (FK, nullable — the actor), action_type (CharField with choices), description (TextField), metadata (JSONField), created_at (auto timestamp).

#### Scenario: Timeline entry created on registration
- **WHEN** a participant is registered for an event via POST `/api/events/{slug}/register/`
- **THEN** the system SHALL create a TimelineEntry with action_type `registered`
- **THEN** the description SHALL contain the participant's full name and booking option

#### Scenario: Timeline entry created on unregistration
- **WHEN** a participant is removed via DELETE `/api/events/{slug}/participants/{id}/`
- **THEN** the system SHALL create a TimelineEntry with action_type `unregistered`
- **THEN** the description SHALL contain the participant's full name

#### Scenario: Timeline entry created on payment
- **WHEN** a payment is recorded via POST `/api/events/{slug}/payments/`
- **THEN** the system SHALL create a TimelineEntry with action_type `payment_received`
- **THEN** the metadata SHALL include payment amount, method, and location

#### Scenario: Timeline entry created on payment removal
- **WHEN** a payment is deleted via DELETE `/api/events/{slug}/payments/{id}/`
- **THEN** the system SHALL create a TimelineEntry with action_type `payment_removed`

### Requirement: Timeline API endpoint
The system SHALL provide a paginated timeline endpoint for event managers.

#### Scenario: List event timeline
- **WHEN** GET `/api/events/{slug}/timeline/?page=1&page-size=20`
- **THEN** the system SHALL return a paginated list of TimelineEntry records
- **THEN** entries SHALL be ordered by `created_at` descending (newest first)
- **THEN** each entry SHALL include: id, action_type, description, metadata, user (name + email if available), participant (name if available), created_at

#### Scenario: Timeline requires manager permission
- **WHEN** a non-manager user requests GET `/api/events/{slug}/timeline/`
- **THEN** the system SHALL return 403 Forbidden

#### Scenario: Filter timeline by participant
- **WHEN** GET `/api/events/{slug}/timeline/?participant-id={id}`
- **THEN** the system SHALL return only entries for that specific participant

#### Scenario: Filter timeline by action type
- **WHEN** GET `/api/events/{slug}/timeline/?action-type=payment_received`
- **THEN** the system SHALL return only entries of that action type

### Requirement: Timeline action types
The system SHALL support the following action_type values: `registered`, `unregistered`, `payment_received`, `payment_removed`, `booking_changed`, `label_added`, `label_removed`, `custom_field_updated`, `mail_sent`, `participant_updated`.

#### Scenario: All action types are valid
- **WHEN** a TimelineEntry is created with any of the defined action types
- **THEN** the entry SHALL be saved successfully

#### Scenario: Invalid action type rejected
- **WHEN** a TimelineEntry is created with an undefined action_type
- **THEN** the system SHALL raise a validation error

### Requirement: Timeline entries for mail actions
The system SHALL create timeline entries when mails are sent to participants.

#### Scenario: Rundmail sent
- **WHEN** a mail is sent via POST `/api/events/{slug}/send-mail/`
- **THEN** the system SHALL create a TimelineEntry with action_type `mail_sent` for each recipient participant
- **THEN** the metadata SHALL include the mail subject

### Requirement: Timeline Frontend display
The frontend SHALL display the timeline as a vertical chronological list with action-type-specific icons and colors.

#### Scenario: Timeline view in dashboard
- **WHEN** the manager views the Timeline tab in the event dashboard
- **THEN** the system SHALL show a chronological list with date grouping
- **THEN** each entry SHALL show an icon (based on action_type), description, actor name, and timestamp
- **THEN** entries SHALL be loadable via "Mehr laden" button (paginated)
