## ADDED Requirements

### Requirement: Guest registration endpoint
The system SHALL provide a public API endpoint for guest registration that does not require authentication.

#### Scenario: Successful guest registration for public event
- **WHEN** POST `/api/events/{slug}/register-guest/` with body `{ persons: [{ first_name, last_name, booking_option_id }], email: "parent@example.com" }`
- **AND** the event has `guest_registration_enabled=True`
- **AND** the event phase is `registration`
- **THEN** the system SHALL create a User account with the provided email (if not already existing)
- **THEN** the system SHALL create Person records for each person in the request, linked to the user
- **THEN** the system SHALL create a Registration linked to the user and event
- **THEN** the system SHALL create Participant records from each Person
- **THEN** the API SHALL return HTTP 201 with `{ registration_id, participant_count, email }`

#### Scenario: Guest registration with existing email
- **WHEN** POST `/api/events/{slug}/register-guest/` with an email that already belongs to an existing User
- **THEN** the system SHALL use the existing User account
- **THEN** the system SHALL create the Person, Registration, and Participant records linked to that existing User
- **THEN** the API SHALL return HTTP 201

#### Scenario: Guest registration with full person data
- **WHEN** POST `/api/events/{slug}/register-guest/` with person data
- **THEN** the system SHALL accept the following fields per person: `first_name` (required), `last_name` (required), `scout_name` (optional), `birthday` (optional), `gender` (optional), `booking_option_id` (required)
- **THEN** the `email` field SHALL be a top-level field (shared for all persons in one submission)

#### Scenario: Guest registration blocked when disabled
- **WHEN** POST `/api/events/{slug}/register-guest/`
- **AND** the event has `guest_registration_enabled=False` (default)
- **THEN** the API SHALL return HTTP 403 with message "Gastregistrierung ist fuer dieses Event nicht aktiviert."

#### Scenario: Guest registration blocked outside registration phase
- **WHEN** POST `/api/events/{slug}/register-guest/`
- **AND** the event phase is NOT `registration`
- **THEN** the API SHALL return HTTP 400 with message "Die Anmeldephase ist nicht aktiv."

#### Scenario: Guest registration blocked for system booking option
- **WHEN** POST `/api/events/{slug}/register-guest/` with a `booking_option_id` pointing to a system BookingOption
- **THEN** the API SHALL return HTTP 400 with message "Diese Buchungsoption ist nicht verfuegbar."

#### Scenario: Guest registration blocked for expired booking option
- **WHEN** POST `/api/events/{slug}/register-guest/` with a `booking_option_id` pointing to a BookingOption where `bookable_till` is in the past
- **THEN** the API SHALL return HTTP 400 with message "Diese Buchungsoption ist nicht mehr verfuegbar."

#### Scenario: Guest registration blocked for full booking option
- **WHEN** POST `/api/events/{slug}/register-guest/` with a `booking_option_id` pointing to a BookingOption where `is_full=True`
- **THEN** the API SHALL return HTTP 400 with message "Diese Buchungsoption ist bereits ausgebucht."

### Requirement: Event guest registration toggle
The Event model SHALL have a `guest_registration_enabled` field to control whether guest registration is allowed.

#### Scenario: Default value
- **WHEN** a new Event is created
- **THEN** `guest_registration_enabled` SHALL default to `False`

#### Scenario: Toggle via API
- **WHEN** PATCH `/api/events/{slug}/` with `guest_registration_enabled: true`
- **THEN** the field SHALL be updated
- **THEN** only managers SHALL be able to update this field

### Requirement: Guest registration link
The event detail API SHALL include a guest registration URL for managers.

#### Scenario: Manager sees guest registration link
- **WHEN** GET `/api/events/{slug}/` by a manager
- **AND** `guest_registration_enabled` is `True`
- **THEN** the response SHALL include `guest_registration_url` with value `/events/{slug}/register`

#### Scenario: Non-manager does not see guest registration link
- **WHEN** GET `/api/events/{slug}/` by a non-manager or unauthenticated user
- **THEN** the response SHALL NOT include `guest_registration_url`

### Requirement: Guest registration frontend page
The frontend SHALL provide a public registration page accessible without login.

#### Scenario: Guest registration page route
- **WHEN** navigating to `/events/{slug}/register`
- **THEN** the page SHALL be accessible without authentication
- **THEN** the page SHALL display the event name, dates, and location as read-only context

#### Scenario: Guest registration form
- **WHEN** viewing the guest registration page for an event with `guest_registration_enabled=True` during registration phase
- **THEN** the form SHALL display fields for adding one or more persons (first_name, last_name, scout_name, birthday, gender)
- **THEN** for each person, a booking option dropdown SHALL be shown (excluding system and expired options)
- **THEN** at the bottom, an email input field SHALL be displayed (required)
- **THEN** a submit button "Anmelden" SHALL be displayed

#### Scenario: Successful guest registration feedback
- **WHEN** the guest registration form is submitted successfully
- **THEN** a success message SHALL be displayed: "Anmeldung erfolgreich! Eine Bestaetigung wurde an {email} gesendet."
- **THEN** the form SHALL be replaced by the success message (no redirect)

#### Scenario: Guest registration page for disabled event
- **WHEN** navigating to `/events/{slug}/register`
- **AND** `guest_registration_enabled` is `False`
- **THEN** a message SHALL be displayed: "Die Gastregistrierung ist fuer dieses Event nicht aktiviert."

#### Scenario: Guest registration page outside registration phase
- **WHEN** navigating to `/events/{slug}/register`
- **AND** the event phase is NOT `registration`
- **THEN** a message SHALL be displayed explaining why registration is not possible

### Requirement: Confirmation email on guest registration
The system SHALL send a confirmation email after successful guest registration.

#### Scenario: Confirmation email sent
- **WHEN** a guest registration is completed successfully
- **THEN** an email SHALL be sent to the provided email address
- **THEN** the email SHALL contain: event name, list of registered persons with their booking options, event dates, event location

#### Scenario: Timeline entry for guest registration
- **WHEN** a guest registration is completed successfully
- **THEN** a TimelineEntry with action_type `registered` SHALL be created
- **THEN** the description SHALL indicate this was a guest registration
