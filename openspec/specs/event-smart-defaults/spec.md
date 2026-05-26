## MODIFIED Requirements

### Requirement: Default event name with auto-incrementing number
The event creation form SHALL pre-fill the event name with "Mein Lager" followed by an auto-incrementing number based on the user's existing events. The number SHALL be determined via an API call.

#### Scenario: First event for user
- **WHEN** the user opens the event creation form
- **AND** the user has no existing events with names matching "Mein Lager"
- **THEN** the default name SHALL be "Mein Lager 1"

#### Scenario: User has existing "Mein Lager" events
- **WHEN** the user opens the event creation form
- **AND** the user has existing events named "Mein Lager 1" and "Mein Lager 2"
- **THEN** the default name SHALL be "Mein Lager 3"

#### Scenario: API call to count existing events
- **WHEN** the event creation form is initialized
- **THEN** the frontend SHALL call `GET /api/events/?created-by=me` to retrieve the user's events
- **THEN** the frontend SHALL count events whose names match the pattern "Mein Lager" (with or without number)
- **THEN** the next available number SHALL be calculated client-side
- **THEN** the default name SHALL be set to "Mein Lager {next_number}"

#### Scenario: User overrides default name
- **WHEN** the user manually edits the pre-filled event name
- **THEN** the system SHALL NOT overwrite the user's choice
- **THEN** the slug SHALL be re-generated from the user's custom name

### Requirement: Default dates calculated client-side
The event creation form SHALL pre-fill start and end dates with the next weekend, calculated client-side using `date-fns`.

#### Scenario: Default start date is next Saturday
- **WHEN** the user opens the event creation form
- **AND** the start date field is empty
- **THEN** the start date SHALL be pre-filled with the next Saturday (calculated via `date-fns` `nextSaturday()`)
- **THEN** the time component SHALL be set to 10:00

#### Scenario: Default end date is next Sunday
- **WHEN** the user opens the event creation form
- **AND** the end date field is empty
- **THEN** the end date SHALL be pre-filled with the next Sunday (calculated via `date-fns` `nextSunday()`)
- **THEN** the time component SHALL be set to 14:00

#### Scenario: User opens form on a Saturday
- **WHEN** the user opens the event creation form on a Saturday
- **THEN** the start date SHALL be the NEXT Saturday (7 days later), not today
- **THEN** the end date SHALL be the Sunday after that next Saturday

### Requirement: Default registration deadline from start date
The event creation form SHALL automatically set the registration deadline to the Friday before the event start date at 23:59.

#### Scenario: Registration deadline auto-fill
- **WHEN** the start date is set (either via default or manually)
- **AND** the registration deadline field is empty or has not been manually edited
- **THEN** the registration deadline SHALL be auto-filled with the Friday before the start date
- **THEN** the time component SHALL be set to 23:59

#### Scenario: Start date is on a Saturday (default case)
- **WHEN** the start date is Saturday, April 18, 2026
- **AND** the registration deadline field has not been manually edited
- **THEN** the registration deadline SHALL be set to Friday, April 17, 2026, 23:59

#### Scenario: Start date is on a Monday
- **WHEN** the start date is Monday, April 20, 2026
- **AND** the registration deadline field has not been manually edited
- **THEN** the registration deadline SHALL be set to Friday, April 17, 2026, 23:59

#### Scenario: User overrides auto-filled deadline
- **WHEN** the user manually changes the auto-filled registration deadline
- **THEN** the system SHALL NOT overwrite the user's choice on subsequent start date changes
- **THEN** the auto-fill SHALL only apply when the deadline has not been manually edited

## ADDED Requirements

### Requirement: Auto-fill end date from start date
The event creation form SHALL automatically set the end date when a start date is selected.

#### Scenario: Start date on a weekday
- **WHEN** the user selects a start date that is not a Sunday
- **AND** the end date field is empty or has not been manually edited
- **THEN** the end date SHALL be auto-filled with the next Sunday after the start date
- **THEN** the time component SHALL be set to 14:00

#### Scenario: Start date on a Sunday
- **WHEN** the user selects a start date that is a Sunday
- **AND** the end date field is empty or has not been manually edited
- **THEN** the end date SHALL be auto-filled with the same date (single-day event)

#### Scenario: User overrides auto-filled end date
- **WHEN** the user manually changes the auto-filled end date
- **THEN** the system SHALL NOT overwrite the user's choice on subsequent start date changes
- **THEN** the auto-fill SHALL only apply when the end date has not been manually edited

### Requirement: Default booking option with calculated price
The event creation form SHALL auto-generate a default booking option based on event dates.

#### Scenario: Default booking option creation
- **WHEN** both start date and end date are set (either manually or via auto-fill)
- **AND** no booking options have been manually added by the user
- **THEN** a default booking option SHALL be pre-filled with name "Standard", price = number_of_days x 10 EUR
- **THEN** the number of days SHALL be calculated as the difference in calendar days between start and end date (inclusive)

#### Scenario: Price calculation examples
- **WHEN** start date is Saturday and end date is Sunday (2 days)
- **THEN** the default price SHALL be 20 EUR
- **WHEN** start date is Friday and end date is Sunday (3 days)
- **THEN** the default price SHALL be 30 EUR

#### Scenario: User has added custom booking options
- **WHEN** the user has manually added or modified booking options in step 2 (Buchungsoptionen)
- **THEN** the system SHALL NOT overwrite or add a default booking option

#### Scenario: Default booking option is editable
- **WHEN** the default booking option is auto-generated
- **THEN** the user SHALL be able to edit all fields (name, price, description, max_participants)
- **THEN** editing the default option SHALL mark it as manually edited (no further auto-updates)

### Requirement: All defaults calculated client-side
All smart defaults SHALL be calculated on the client-side without requiring server-side computation, except for the event name which requires an API call to count existing events.

#### Scenario: No server roundtrip for date defaults
- **WHEN** the event creation form is initialized
- **THEN** the start date, end date, and registration deadline defaults SHALL be computed client-side using `date-fns`
- **THEN** the booking option default price SHALL be computed client-side from the date difference
- **THEN** no API call SHALL be made for these calculations

#### Scenario: Server call only for name default
- **WHEN** the event creation form is initialized
- **THEN** only one API call SHALL be made: `GET /api/events/?created-by=me`
- **THEN** this call SHALL be used to determine the next "Mein Lager" number

## Auto Free Booking Option

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
