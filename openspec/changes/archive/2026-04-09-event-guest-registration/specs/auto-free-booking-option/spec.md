## MODIFIED Requirements

### Requirement: Automatic system booking option creation
The system SHALL automatically create a system BookingOption with price 0 EUR for every event. The system BookingOption SHALL have the name "Kostenlos (Organisator)" and SHALL be marked with `is_system=True`.

#### Scenario: System booking option created on event creation via API
- **WHEN** a new event is created via `POST /api/events/`
- **THEN** a BookingOption with `name="Kostenlos (Organisator)"`, `price=0.00`, `is_system=True` SHALL be automatically created for that event

#### Scenario: System booking option created on event creation via any method
- **WHEN** a new event is created via Django Admin, management command, or any other method
- **THEN** a system BookingOption SHALL be automatically created (via post_save signal)

#### Scenario: No duplicate system booking options
- **WHEN** an event already has a BookingOption with `is_system=True`
- **THEN** no additional system BookingOption SHALL be created
- **THEN** the database SHALL enforce this via a UniqueConstraint on `(event, is_system=True)`

#### Scenario: Data migration for existing events
- **WHEN** the migration runs on an existing database
- **THEN** every event without a system BookingOption SHALL receive one with `name="Kostenlos (Organisator)"`, `price=0.00`, `is_system=True`

## ADDED Requirements

### Requirement: BookingOption time-windowed availability
The BookingOption model SHALL support time-windowed availability via `bookable_from` and `bookable_till` fields.

#### Scenario: BookingOption with time window
- **WHEN** a BookingOption has `bookable_from` and/or `bookable_till` set
- **THEN** the computed property `is_bookable` SHALL return `True` only when the current time is within the window
- **THEN** if `bookable_from` is null, the option SHALL be bookable from event creation
- **THEN** if `bookable_till` is null, the option SHALL be bookable until event registration deadline

#### Scenario: BookingOption schema includes availability fields
- **WHEN** a BookingOption is returned in any API response
- **THEN** the response SHALL include `bookable_from` (datetime, nullable), `bookable_till` (datetime, nullable), and `is_bookable` (boolean, computed)

#### Scenario: Create booking option with time window
- **WHEN** POST `/api/events/{slug}/booking-options/` with `bookable_from` and/or `bookable_till`
- **THEN** the fields SHALL be saved on the BookingOption

#### Scenario: Update booking option time window
- **WHEN** PATCH `/api/events/{slug}/booking-options/{id}/` with `bookable_from` and/or `bookable_till`
- **THEN** the fields SHALL be updated

#### Scenario: Self-service registration respects time window
- **WHEN** a user calls `POST /api/events/{slug}/register/` with a `booking_option_id` for a BookingOption where `is_bookable` is `False`
- **THEN** the API SHALL return HTTP 400 with message "Diese Buchungsoption ist nicht mehr verfuegbar."

#### Scenario: Guest registration respects time window
- **WHEN** POST `/api/events/{slug}/register-guest/` with a `booking_option_id` for a BookingOption where `is_bookable` is `False`
- **THEN** the API SHALL return HTTP 400 with message "Diese Buchungsoption ist nicht mehr verfuegbar."

### Requirement: Organizer bypasses booking option time restrictions
Organizers SHALL always be able to select any booking option regardless of time window.

#### Scenario: Admin registration with expired booking option
- **WHEN** an organizer calls `POST /api/events/{slug}/register-admin/` with a `booking_option_id` for a BookingOption where `is_bookable` is `False`
- **THEN** the participant SHALL be created with that BookingOption assigned (time check bypassed)

#### Scenario: Organizer updates participant to expired booking option
- **WHEN** an organizer calls `PATCH /api/events/{slug}/participants/{id}/` with a `booking_option_id` for a BookingOption where `is_bookable` is `False`
- **THEN** the participant's booking option SHALL be updated (time check bypassed)

### Requirement: Frontend shows only bookable options to regular users
The frontend registration form SHALL only display currently bookable options to non-manager users.

#### Scenario: Registration form filters expired options
- **WHEN** a regular user views the registration form
- **THEN** only BookingOptions where `is_bookable` is `True` SHALL be shown in the dropdown
- **THEN** system BookingOptions SHALL continue to be hidden (existing behavior)

#### Scenario: Admin registration shows all options
- **WHEN** an organizer uses admin registration or participant editing
- **THEN** all BookingOptions SHALL be visible, including expired ones
- **THEN** expired options SHALL be visually marked (e.g., strikethrough or "(abgelaufen)" suffix)
