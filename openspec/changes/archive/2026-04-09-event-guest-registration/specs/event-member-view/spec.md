## ADDED Requirements

### Requirement: Guest registration link display for organizers
The event dashboard SHALL show the guest registration link to organizers when guest registration is enabled.

#### Scenario: Settings tab shows guest registration toggle
- **WHEN** an organizer views the Settings tab of the event dashboard
- **THEN** a toggle for "Gastregistrierung aktivieren" SHALL be displayed
- **THEN** when enabled, a copyable link to `/events/{slug}/register` SHALL be displayed
- **THEN** a "Link kopieren" button SHALL copy the full URL to the clipboard

#### Scenario: Overview tab shows guest registration status
- **WHEN** an organizer views the Overview tab
- **AND** `guest_registration_enabled` is `True`
- **THEN** a hint card SHALL be displayed: "Gastregistrierung aktiv — Teile den Anmeldelink mit Eltern"
- **THEN** the link SHALL be clickable and copyable

## MODIFIED Requirements

### Requirement: Registration tab with re-registration support
The registration tab SHALL allow users to register, update their registration, or unregister.

#### Scenario: New registration
- **WHEN** a user who is not registered views the registration tab
- **AND** the event phase is `registration`
- **THEN** the registration form SHALL be displayed (person selection + booking option assignment)

#### Scenario: Update existing registration
- **WHEN** a user who is already registered views the registration tab
- **THEN** the tab SHALL show their current registration with all participants
- **THEN** for each participant, options to change booking option or remove the participant SHALL be available
- **THEN** an option to add additional persons to the registration SHALL be available

#### Scenario: Unregister
- **WHEN** a registered user wants to unregister
- **THEN** a "Abmelden" button SHALL be available
- **THEN** clicking it SHALL show a confirmation dialog
- **THEN** confirming SHALL soft-delete the registration (set deleted_at, not hard-delete)

#### Scenario: Registration outside registration phase
- **WHEN** the event phase is NOT `registration`
- **THEN** the registration form SHALL be disabled
- **THEN** a message SHALL explain why registration is not possible (e.g., "Die Anmeldephase hat noch nicht begonnen" or "Die Anmeldephase ist beendet")
- **THEN** if the user is already registered, their registration details SHALL still be visible

#### Scenario: Booking option dropdown shows only bookable options
- **WHEN** a regular user views the booking option dropdown during registration
- **THEN** only BookingOptions where `is_bookable` is `True` SHALL be displayed
- **THEN** expired or not-yet-available options SHALL be hidden
