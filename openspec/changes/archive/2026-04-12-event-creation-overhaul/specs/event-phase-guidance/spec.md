## ADDED Requirements

### Requirement: Contextual phase explanation with action instructions
Each event phase SHALL have a dedicated contextual explanation consisting of a status description and a concrete action instruction. The explanation SHALL be displayed prominently in the "Übersicht" tab of the event dashboard, replacing the current generic info banner.

#### Scenario: Phase explanation displayed in overview
- **WHEN** an organizer views the "Übersicht" tab of an event
- **THEN** a prominent phase explanation component SHALL be displayed at the top of the tab content, below the event header

#### Scenario: Replaces generic info banner
- **WHEN** the phase explanation component is rendered
- **THEN** the previous generic info banner SHALL NOT be displayed; the phase explanation SHALL be the sole phase status indicator in the overview

### Requirement: Draft phase guidance
When an event is in the `draft` phase, the system SHALL display the status text "Dein Event ist noch nicht veröffentlicht. Teilnehmer können sich noch nicht anmelden." with the action instruction "Konfiguriere dein Event und setze ein Registrierungsdatum, um die Anmeldung zu aktivieren."

#### Scenario: Draft event overview
- **WHEN** the organizer views the overview of an event in `draft` phase
- **THEN** the phase guidance SHALL display status "Dein Event ist noch nicht veröffentlicht. Teilnehmer können sich noch nicht anmelden." and action "Konfiguriere dein Event und setze ein Registrierungsdatum, um die Anmeldung zu aktivieren."

#### Scenario: Draft phase action link
- **WHEN** the draft phase guidance is displayed
- **THEN** the action text SHALL include a clickable link "Registrierungsdatum" that navigates to the "Einstellungen" tab with the registration date section scrolled into view

### Requirement: Pre-registration phase guidance
When an event is in the `pre_registration` phase, the system SHALL display the status text "Die Anmeldung beginnt am {date}." (with the actual registration start date formatted as DD.MM.YYYY) and the action instruction "Lade in der Zwischenzeit Teilnehmer ein."

#### Scenario: Pre-registration event overview
- **WHEN** the organizer views the overview of an event in `pre_registration` phase with registration start date 15.06.2026
- **THEN** the phase guidance SHALL display status "Die Anmeldung beginnt am 15.06.2026." and action "Lade in der Zwischenzeit Teilnehmer ein."

#### Scenario: Pre-registration action link
- **WHEN** the pre-registration phase guidance is displayed
- **THEN** the action text SHALL include a clickable link "Teilnehmer einladen" that navigates to the "Einladung & Gäste" tab

### Requirement: Registration phase guidance
When an event is in the `registration` phase, the system SHALL display the status text "Die Anmeldung ist offen bis {date}." (with the registration end date formatted as DD.MM.YYYY) and the action instruction "Teile den Anmeldelink mit deiner Gruppe."

#### Scenario: Registration event overview
- **WHEN** the organizer views the overview of an event in `registration` phase with registration end date 30.06.2026
- **THEN** the phase guidance SHALL display status "Die Anmeldung ist offen bis 30.06.2026." and action "Teile den Anmeldelink mit deiner Gruppe."

#### Scenario: Registration action link
- **WHEN** the registration phase guidance is displayed
- **THEN** the action text SHALL include a "Link kopieren" button that copies the event registration URL to the clipboard

#### Scenario: Registration with participant count
- **WHEN** the event has 12 of 30 spots filled during registration phase
- **THEN** the phase guidance SHALL additionally display "12 von 30 Plätzen belegt." below the status text

### Requirement: Pre-event phase guidance
When an event is in the `pre_event` phase, the system SHALL display the status text "Die Anmeldung ist geschlossen. Das Event beginnt am {date}." (with the event start date formatted as DD.MM.YYYY) and the action instruction "Überprüfe die Teilnehmerliste und Zahlungen."

#### Scenario: Pre-event overview
- **WHEN** the organizer views the overview of an event in `pre_event` phase with event start date 15.07.2026
- **THEN** the phase guidance SHALL display status "Die Anmeldung ist geschlossen. Das Event beginnt am 15.07.2026." and action "Überprüfe die Teilnehmerliste und Zahlungen."

#### Scenario: Pre-event action links
- **WHEN** the pre-event phase guidance is displayed
- **THEN** the action text SHALL include two clickable links: "Teilnehmerliste" navigating to `?tab=participants` and "Zahlungen" navigating to `?tab=payments`

### Requirement: Running phase guidance
When an event is in the `running` phase, the system SHALL display the status text "Das Event läuft gerade!" and the action instruction "Nutze das Anwesenheits-Tracking."

#### Scenario: Running event overview
- **WHEN** the organizer views the overview of an event in `running` phase
- **THEN** the phase guidance SHALL display status "Das Event läuft gerade!" and action "Nutze das Anwesenheits-Tracking."

#### Scenario: Running phase action link
- **WHEN** the running phase guidance is displayed
- **THEN** the action text SHALL include a clickable link "Anwesenheits-Tracking" that navigates to the attendance tracking feature within the participants tab

### Requirement: Completed phase guidance
When an event is in the `completed` phase, the system SHALL display the status text "Das Event ist abgeschlossen." and the action instruction "Exportiere Teilnehmerdaten und archiviere das Event."

#### Scenario: Completed event overview
- **WHEN** the organizer views the overview of an event in `completed` phase
- **THEN** the phase guidance SHALL display status "Das Event ist abgeschlossen." and action "Exportiere Teilnehmerdaten und archiviere das Event."

#### Scenario: Completed phase action links
- **WHEN** the completed phase guidance is displayed
- **THEN** the action text SHALL include two clickable links: "Exportieren" navigating to `?tab=activity` (exports section) and "Archivieren" triggering the archive action

### Requirement: Visual distinction per phase using colored Alert components
Each phase guidance SHALL use a visually distinct Alert component with a phase-specific color scheme. The color mapping SHALL be: `draft` = slate/gray, `pre_registration` = blue, `registration` = green, `pre_event` = amber/yellow, `running` = emerald, `completed` = violet/purple. The Alert SHALL use the shadcn/ui Alert component with custom styling.

#### Scenario: Draft phase visual style
- **WHEN** an event is in the `draft` phase
- **THEN** the phase guidance Alert SHALL use a slate/gray color scheme with a muted appearance

#### Scenario: Registration phase visual style
- **WHEN** an event is in the `registration` phase
- **THEN** the phase guidance Alert SHALL use a green color scheme indicating an active/open state

#### Scenario: Pre-event phase visual style
- **WHEN** an event is in the `pre_event` phase
- **THEN** the phase guidance Alert SHALL use an amber/yellow color scheme indicating attention/preparation needed

#### Scenario: Running phase visual style
- **WHEN** an event is in the `running` phase
- **THEN** the phase guidance Alert SHALL use an emerald color scheme indicating active/live status

#### Scenario: Completed phase visual style
- **WHEN** an event is in the `completed` phase
- **THEN** the phase guidance Alert SHALL use a violet/purple color scheme indicating a finished/archived state

### Requirement: Phase guidance includes relevant action links
Each phase guidance SHALL include inline links or buttons that navigate directly to the relevant section or action. Links SHALL use the new consolidated tab IDs from the tab consolidation spec.

#### Scenario: Link navigates to correct tab
- **WHEN** the user clicks a link within the phase guidance (e.g., "Teilnehmerliste")
- **THEN** the dashboard SHALL navigate to the corresponding tab using the `?tab=` URL parameter

#### Scenario: Link opens external action
- **WHEN** the user clicks an action button like "Link kopieren"
- **THEN** the action SHALL execute immediately (e.g., copy to clipboard) and show a success toast "Link wurde kopiert!"

### Requirement: Phase guidance responsive layout
The phase guidance Alert component SHALL be responsive. On mobile (< 640px), the status and action text SHALL stack vertically. Action buttons SHALL be full-width on mobile. On desktop, the status and action text MAY be displayed side-by-side with inline action buttons.

#### Scenario: Phase guidance on mobile
- **WHEN** the overview tab is viewed on a mobile screen (< 640px)
- **THEN** the Alert SHALL display the status text, then the action instruction below it, with action links/buttons as full-width elements

#### Scenario: Phase guidance on desktop
- **WHEN** the overview tab is viewed on a desktop screen (>= 1024px)
- **THEN** the Alert SHALL display the status text and action instruction in a compact layout with inline action links
