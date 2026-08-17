## ADDED Requirements

### Requirement: Soft-delete for registrations
The system SHALL support soft-deletion of registrations with a reason, preserving the data for audit purposes.

#### Scenario: Soft-delete a registration
- **WHEN** DELETE `/api/events/{slug}/participants/{id}/` is called
- **THEN** the system SHALL set `deleted_at` to the current timestamp
- **THEN** the system SHALL set `deleted_by` to the requesting user
- **THEN** the system SHALL NOT hard-delete the Registration or Participant records
- **THEN** the API SHALL return HTTP 204

#### Scenario: Soft-delete with reason
- **WHEN** DELETE `/api/events/{slug}/participants/{id}/` is called with body `{ reason: "cancel" }`
- **THEN** the system SHALL store the reason in `deleted_reason`
- **THEN** valid reasons SHALL be: `duplicate`, `error`, `cancel`, `other`
- **THEN** if no reason is provided, the default SHALL be `cancel`

#### Scenario: Soft-deleted participants are hidden from normal queries
- **WHEN** GET `/api/events/{slug}/participants/`
- **THEN** participants belonging to soft-deleted registrations SHALL NOT be included
- **THEN** participant counts and statistics SHALL NOT include soft-deleted registrations

#### Scenario: Timeline entry for soft-delete
- **WHEN** a participant is soft-deleted
- **THEN** a TimelineEntry with action_type `unregistered` SHALL be created
- **THEN** the metadata SHALL include the deletion reason

### Requirement: Inline person creation for admin registration
The admin registration endpoint SHALL accept inline person data without requiring a pre-existing Person record.

#### Scenario: Admin registration with inline person data
- **WHEN** POST `/api/events/{slug}/register-admin/` with body `{ persons: [{ person_data: { first_name, last_name, email, ... }, booking_option_id }] }`
- **THEN** the system SHALL create a new Person record linked to a user (determined by email or created)
- **THEN** the system SHALL create a Participant from the new Person
- **THEN** the API SHALL return HTTP 201

#### Scenario: Admin registration with existing person ID
- **WHEN** POST `/api/events/{slug}/register-admin/` with body `{ persons: [{ person_id: 123, booking_option_id }] }`
- **THEN** the existing behavior SHALL be preserved (use existing Person)

#### Scenario: Admin registration with mixed input
- **WHEN** POST `/api/events/{slug}/register-admin/` with body `{ persons: [{ person_id: 123, booking_option_id: 1 }, { person_data: { first_name: "Max", last_name: "Muster" }, booking_option_id: 2 }] }`
- **THEN** the system SHALL handle both types in a single request

#### Scenario: Admin can select any booking option
- **WHEN** an organizer registers via `register-admin`
- **THEN** the organizer SHALL be able to select any BookingOption including: system options, expired options (past `bookable_till`), and full options
- **THEN** no availability or capacity checks SHALL be applied for admin registrations

### Requirement: Admin can manage all registrations
Organizers SHALL be able to fully edit and remove any participant's registration.

#### Scenario: Admin updates any participant
- **WHEN** PATCH `/api/events/{slug}/participants/{id}/` by a manager
- **THEN** the manager SHALL be able to update any field including booking_option
- **THEN** a TimelineEntry SHALL be created

#### Scenario: Admin removes any participant
- **WHEN** DELETE `/api/events/{slug}/participants/{id}/` by a manager
- **THEN** the participant SHALL be soft-deleted
- **THEN** the manager SHALL be able to remove any participant (not just their own)

### Requirement: Confirmation email on registration
The system SHALL send a confirmation email after every successful registration.

#### Scenario: Confirmation email for authenticated registration
- **WHEN** a user registers via `POST /api/events/{slug}/register/`
- **THEN** a confirmation email SHALL be sent to the user's email address
- **THEN** the email SHALL contain: event name, registered persons with booking options, event dates, location

#### Scenario: Confirmation email for admin registration
- **WHEN** an organizer registers a participant via `POST /api/events/{slug}/register-admin/`
- **AND** the participant has an email address
- **THEN** a confirmation email SHALL be sent to the participant's email address

#### Scenario: No confirmation email without email
- **WHEN** a participant is registered without an email address
- **THEN** no confirmation email SHALL be sent
- **THEN** the registration SHALL still succeed
