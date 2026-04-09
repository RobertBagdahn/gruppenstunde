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

### Requirement: System booking option is immutable
The system BookingOption SHALL NOT be editable or deletable by any user, including organizers.

#### Scenario: Attempt to update system booking option
- **WHEN** `PATCH /api/events/{slug}/booking-options/{id}/` is called for a BookingOption where `is_system=True`
- **THEN** the API SHALL return HTTP 403 with error message "System-Buchungsoptionen koennen nicht bearbeitet werden."

#### Scenario: Attempt to delete system booking option
- **WHEN** `DELETE /api/events/{slug}/booking-options/{id}/` is called for a BookingOption where `is_system=True`
- **THEN** the API SHALL return HTTP 403 with error message "System-Buchungsoptionen koennen nicht geloescht werden."

#### Scenario: Cannot create booking option with is_system flag
- **WHEN** `POST /api/events/{slug}/booking-options/` is called with `is_system=True` in the request body
- **THEN** the `is_system` field SHALL be ignored (not exposed in the input schema)

### Requirement: System booking option visibility based on role
The system BookingOption SHALL only be visible to event managers/organizers.

#### Scenario: Event detail for event manager
- **WHEN** an authenticated user who is an event manager requests `GET /api/events/{slug}/`
- **THEN** the `booking_options` array SHALL include the system BookingOption with `is_system=true`

#### Scenario: Event detail for regular user
- **WHEN** an authenticated user who is NOT an event manager requests `GET /api/events/{slug}/`
- **THEN** the `booking_options` array SHALL NOT include BookingOptions where `is_system=True`

#### Scenario: Event detail for unauthenticated user
- **WHEN** an unauthenticated user requests `GET /api/events/{slug}/`
- **THEN** the `booking_options` array SHALL NOT include BookingOptions where `is_system=True`

### Requirement: BookingOption schema includes is_system field
The BookingOption API response schema SHALL include the `is_system` boolean field.

#### Scenario: BookingOption response format
- **WHEN** a BookingOption is returned in any API response
- **THEN** the response SHALL include `is_system: boolean` alongside existing fields (id, name, description, price, max_participants, current_participant_count, is_full, created_at)

### Requirement: Organizer can assign system booking option
Event managers SHALL be able to assign the system BookingOption to participants via admin registration and participant update.

#### Scenario: Admin registers participant with system booking option
- **WHEN** an event manager calls `POST /api/events/{slug}/admin-register/` with `booking_option_id` pointing to a system BookingOption
- **THEN** the participant SHALL be created with the system BookingOption assigned

#### Scenario: Manager updates participant to system booking option
- **WHEN** an event manager calls `PATCH /api/events/{slug}/participants/{id}/` with `booking_option_id` pointing to a system BookingOption
- **THEN** the participant's booking option SHALL be updated to the system BookingOption

### Requirement: Self-service registration excludes system booking option
Regular users registering themselves SHALL NOT be able to select the system BookingOption.

#### Scenario: Self-service registration with system booking option
- **WHEN** a user calls `POST /api/events/{slug}/register/` with `booking_option_id` pointing to a system BookingOption
- **THEN** the API SHALL return HTTP 400 with error message "Diese Buchungsoption ist nicht verfuegbar."

### Requirement: Organizer can bypass capacity limits
Event managers SHALL be able to assign any BookingOption to participants regardless of capacity limits.

#### Scenario: Admin registers participant with full booking option
- **WHEN** an event manager calls `POST /api/events/{slug}/admin-register/` with a `booking_option_id` for a BookingOption where `is_full=True`
- **THEN** the participant SHALL be created with that BookingOption assigned (capacity check bypassed)

#### Scenario: Manager updates participant to full booking option
- **WHEN** an event manager calls `PATCH /api/events/{slug}/participants/{id}/` with a `booking_option_id` for a BookingOption where `is_full=True`
- **THEN** the participant's booking option SHALL be updated (capacity check bypassed)

### Requirement: Frontend system booking option display
The frontend SHALL visually distinguish system BookingOptions and prevent user interaction with protected options.

#### Scenario: Dashboard settings shows system option as locked
- **WHEN** an organizer views the BookingOptions section in the event dashboard settings
- **THEN** the system BookingOption SHALL be displayed with a visual indicator (e.g., lock icon or "System" badge)
- **THEN** the edit and delete buttons SHALL NOT be shown for the system BookingOption

#### Scenario: Registration form hides system option for regular users
- **WHEN** a regular user views the registration form for an event
- **THEN** the system BookingOption SHALL NOT appear in the booking option dropdown

#### Scenario: Admin registration form shows system option
- **WHEN** an organizer uses the admin registration or participant edit functionality
- **THEN** the system BookingOption SHALL appear in the booking option dropdown with a visual indicator
