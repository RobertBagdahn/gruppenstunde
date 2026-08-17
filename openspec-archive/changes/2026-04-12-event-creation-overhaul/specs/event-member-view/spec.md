## MODIFIED Requirements

### Requirement: Member tab structure consolidated
The member tab navigation SHALL be consolidated from 5 tabs (Übersicht, Anmeldung, Teilnehmende, Einladung, Packliste) to 4 tabs by merging registration into the overview tab.

#### Scenario: Tab navigation for members
- **WHEN** an invited (non-manager) user views the event detail page
- **THEN** the following tabs SHALL be available: Übersicht, Teilnehmende, Einladung & Gäste, Packliste
- **THEN** the "Anmeldung" tab SHALL NOT appear as a separate tab
- **THEN** the active tab SHALL be reflected in the URL as a query parameter (e.g., `?tab=overview`)

#### Scenario: Tab order and labels
- **WHEN** the member tabs are rendered
- **THEN** they SHALL appear in this order: "Übersicht", "Teilnehmende", "Einladung & Gäste", "Packliste"
- **THEN** tab labels SHALL be in German

### Requirement: Übersicht tab includes registration
The Übersicht tab SHALL include registration status and registration form, replacing the former separate "Anmeldung" tab. Registration functionality MUST be directly accessible from the overview.

#### Scenario: Overview with registration status for registered user
- **WHEN** a registered member views the Übersicht tab
- **THEN** the tab SHALL show event information (name, dates, location, phase timeline)
- **THEN** the tab SHALL show a registration status card: "Du bist angemeldet" with participant count
- **THEN** options to update the registration (change booking option, add/remove participants) SHALL be available inline
- **THEN** an "Abmelden" button SHALL be visible

#### Scenario: Overview with registration form for unregistered user
- **WHEN** an unregistered member views the Übersicht tab
- **AND** the event phase is `registration`
- **THEN** the tab SHALL show event information followed by the registration form
- **THEN** the registration form SHALL include person selection and booking option assignment
- **THEN** a prominent "Jetzt anmelden" call-to-action SHALL be displayed

#### Scenario: Overview with registration outside registration phase
- **WHEN** the event phase is NOT `registration`
- **AND** the user is not registered
- **THEN** the registration form SHALL be disabled
- **THEN** a message SHALL explain why: "Die Anmeldephase hat noch nicht begonnen" (pre_registration) or "Die Anmeldephase ist beendet" (pre_event/running/completed)

#### Scenario: Unregister from overview
- **WHEN** a registered user clicks "Abmelden" on the Übersicht tab
- **THEN** a confirmation dialog SHALL appear: "Möchtest du dich wirklich abmelden?"
- **THEN** confirming SHALL soft-delete the registration (set deleted_at, not hard-delete)

#### Scenario: Booking option dropdown shows only bookable options
- **WHEN** a regular user views the booking option dropdown during registration
- **THEN** only BookingOptions where `is_bookable` is `True` SHALL be displayed
- **THEN** expired or not-yet-available options SHALL be hidden

### Requirement: Phase guidance banners
The event detail page SHALL show phase-specific guidance banners with concrete action instructions, replacing the generic "Event befindet sich im Entwurf" message.

#### Scenario: Draft phase banner
- **WHEN** the event is in `draft` phase
- **THEN** a guidance banner SHALL display: "Dein Event ist noch nicht veröffentlicht. Teilnehmer können sich noch nicht anmelden."
- **THEN** the banner SHALL include the action hint: "Konfiguriere dein Event und setze ein Registrierungsdatum, um die Anmeldung zu aktivieren."

#### Scenario: Pre-registration phase banner
- **WHEN** the event is in `pre_registration` phase
- **THEN** a guidance banner SHALL display: "Die Anmeldung beginnt am {date}."
- **THEN** the banner SHALL include the action hint: "Lade in der Zwischenzeit Teilnehmer ein."

#### Scenario: Registration phase banner
- **WHEN** the event is in `registration` phase
- **THEN** a guidance banner SHALL display: "Die Anmeldung ist offen bis {date}."
- **THEN** the banner SHALL include the action hint: "Teile den Anmeldelink mit deiner Gruppe."

#### Scenario: Pre-event phase banner
- **WHEN** the event is in `pre_event` phase
- **THEN** a guidance banner SHALL display: "Die Anmeldung ist geschlossen. Das Event beginnt am {date}."
- **THEN** the banner SHALL include the action hint: "Überprüfe die Teilnehmerliste und Zahlungen."

#### Scenario: Running phase banner
- **WHEN** the event is in `running` phase
- **THEN** a guidance banner SHALL display: "Das Event läuft gerade!"
- **THEN** the banner SHALL include the action hint: "Nutze das Anwesenheits-Tracking."

#### Scenario: Completed phase banner
- **WHEN** the event is in `completed` phase
- **THEN** a guidance banner SHALL display: "Das Event ist abgeschlossen."
- **THEN** the banner SHALL include the action hint: "Exportiere Teilnehmerdaten und archiviere das Event."

#### Scenario: Banner visibility for both roles
- **WHEN** any user (member or manager) views the event detail page
- **THEN** the phase guidance banner SHALL be visible at the top of the Übersicht tab
- **THEN** the banner SHALL use a visually distinct style (colored background matching the phase)

## ADDED Requirements

### Requirement: Guest registration link display for organizers
The event dashboard SHALL show the guest registration link to organizers when guest registration is enabled.

#### Scenario: Settings tab shows guest registration toggle
- **WHEN** an organizer views the Settings tab of the event dashboard
- **THEN** a toggle for "Gastregistrierung aktivieren" SHALL be displayed
- **THEN** when enabled, a copyable link to `/events/{slug}/register` SHALL be displayed
- **THEN** a "Link kopieren" button SHALL copy the full URL to the clipboard

#### Scenario: Overview tab shows guest registration status
- **WHEN** an organizer views the Übersicht tab
- **AND** `guest_registration_enabled` is `True`
- **THEN** a hint card SHALL be displayed: "Gastregistrierung aktiv — Teile den Anmeldelink mit Eltern"
- **THEN** the link SHALL be clickable and copyable
