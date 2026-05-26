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

## Phase Timeline

### Requirement: Event phase calculation
The system SHALL calculate the current event phase based on existing date fields (`created_at`, `registration_start`, `registration_deadline`, `start_date`, `end_date`).

#### Scenario: Phase is draft when no registration dates set
- **WHEN** an event has no `registration_start` and no `start_date`
- **THEN** the phase SHALL be `draft`

#### Scenario: Phase is pre_registration before registration opens
- **WHEN** `registration_start` is set AND current time is before `registration_start`
- **THEN** the phase SHALL be `pre_registration`

#### Scenario: Phase is registration during open registration
- **WHEN** `registration_start` is set AND current time is on or after `registration_start`
- **AND** either `registration_deadline` is not set OR current time is on or before `registration_deadline`
- **AND** `start_date` is not set OR current time is before `start_date`
- **THEN** the phase SHALL be `registration`

#### Scenario: Phase is pre_event after registration closes
- **WHEN** `registration_deadline` is set AND current time is after `registration_deadline`
- **AND** `start_date` is set AND current time is before `start_date`
- **THEN** the phase SHALL be `pre_event`

#### Scenario: Phase is running during event
- **WHEN** `start_date` is set AND current time is on or after `start_date`
- **AND** either `end_date` is not set OR current time is on or before `end_date`
- **THEN** the phase SHALL be `running`

#### Scenario: Phase is completed after event ends
- **WHEN** `end_date` is set AND current time is after `end_date`
- **THEN** the phase SHALL be `completed`

### Requirement: Event phase in API response
The event detail API response SHALL include the computed phase.

#### Scenario: Phase included in event detail
- **WHEN** GET `/api/events/{slug}/`
- **THEN** the response SHALL include a `phase` field with one of: `draft`, `pre_registration`, `registration`, `pre_event`, `running`, `completed`

#### Scenario: Phase included in event list
- **WHEN** GET `/api/events/`
- **THEN** each event in the response SHALL include a `phase` field

### Requirement: Visual phase timeline component
The frontend SHALL display a visual timeline showing all event phases with the current phase highlighted.

#### Scenario: Timeline displays on event detail overview
- **WHEN** a user views the event detail overview tab
- **THEN** a horizontal timeline SHALL be displayed showing phases as connected steps
- **THEN** phases with dates SHALL show the associated date below the step
- **THEN** the current phase SHALL be visually highlighted (e.g., primary color, filled circle)
- **THEN** past phases SHALL appear as completed (e.g., check mark, muted color)
- **THEN** future phases SHALL appear as pending (e.g., empty circle, lighter color)

#### Scenario: Timeline adapts to available dates
- **WHEN** an event has no `registration_start` set
- **THEN** the timeline SHALL skip the `pre_registration` and `registration` steps
- **THEN** only steps with corresponding dates SHALL be shown

#### Scenario: Timeline on mobile
- **WHEN** the timeline is viewed on a mobile device (< 768px)
- **THEN** the timeline SHALL display as a vertical stepper instead of horizontal
- **THEN** each step SHALL show the phase label and date

### Requirement: Phase-based German labels
Each phase SHALL have a German display label for the UI.

#### Scenario: Phase labels mapping
- **WHEN** a phase is displayed in the UI
- **THEN** the following labels SHALL be used:
  - `draft` → "Erstellt"
  - `pre_registration` → "Vor Anmeldephase"
  - `registration` → "Anmeldephase"
  - `pre_event` → "Vor dem Event"
  - `running` → "Event läuft"
  - `completed` → "Abgeschlossen"

## Manual Phase

### Requirement: EventPhaseChoices in choices.py
A new `EventPhaseChoices` TextChoices class SHALL be created in `backend/event/choices.py` to define all valid event phases.

#### Scenario: EventPhaseChoices definition
- **WHEN** the EventPhaseChoices class is defined
- **THEN** it SHALL contain the following choices:
  - `DRAFT = "draft", "Entwurf"`
  - `PRE_REGISTRATION = "pre_registration", "Vor der Anmeldung"`
  - `REGISTRATION = "registration", "Anmeldung offen"`
  - `PRE_EVENT = "pre_event", "Vor dem Event"`
  - `RUNNING = "running", "Event läuft"`
  - `COMPLETED = "completed", "Abgeschlossen"`

### Requirement: manual_phase field on Event model
A new `manual_phase` field SHALL be added to the `Event` model to allow manual override of the computed phase.

#### Scenario: manual_phase field definition
- **WHEN** the Event model is inspected
- **THEN** it SHALL have a field `manual_phase` with the following properties:
  - `CharField(max_length=20)`
  - `choices=EventPhaseChoices.choices`
  - `null=True, blank=True`
  - `default=None`
  - `verbose_name="Manuelle Phase"`

#### Scenario: Database migration
- **WHEN** `uv run python manage.py makemigrations` is run after adding the field
- **THEN** a migration SHALL be generated for the `event` app adding the `manual_phase` field

### Requirement: manual_phase overrides compute_phase
When `manual_phase` is set on an Event, it SHALL override the return value of `compute_phase()`.

#### Scenario: manual_phase is set
- **WHEN** an Event has `manual_phase = "registration"`
- **AND** the automatic computation would return `"draft"`
- **THEN** `compute_phase()` SHALL return `"registration"`

#### Scenario: manual_phase is None
- **WHEN** an Event has `manual_phase = None`
- **THEN** `compute_phase()` SHALL return the automatically computed phase based on date fields (existing logic unchanged)

#### Scenario: manual_phase with invalid value
- **WHEN** a request tries to set `manual_phase` to a value not in EventPhaseChoices
- **THEN** the model validation SHALL reject the value
- **THEN** the API SHALL return 422 Unprocessable Entity

### Requirement: Pydantic schema for manual_phase
The Event Pydantic schemas SHALL include the `manual_phase` field.

#### Scenario: EventOut schema includes manual_phase
- **WHEN** an Event is serialized via `EventOut` or `EventDetailOut`
- **THEN** the response SHALL include `manual_phase` as `str | None`
- **THEN** the response SHALL include `phase` as the resolved phase (considering manual override)

#### Scenario: EventUpdateIn schema accepts manual_phase
- **WHEN** a PATCH request is sent to `/api/events/{slug}/`
- **THEN** the `EventUpdateIn` schema SHALL accept `manual_phase` as an optional `str | None` field
- **THEN** setting `manual_phase` to `null` SHALL clear the manual override

### Requirement: Zod schema for manual_phase
The frontend Zod schemas SHALL be synchronized with the backend Pydantic schemas.

#### Scenario: Zod EventSchema includes manual_phase
- **WHEN** the Zod EventSchema is defined in `frontend/src/schemas/event.ts`
- **THEN** it SHALL include `manual_phase` as `z.string().nullable()`
- **THEN** the EventPhaseChoices SHALL be defined as a Zod enum or union type

### Requirement: Manual phase UI in Settings tab
The event dashboard Settings tab SHALL include a dropdown to set the manual phase.

#### Scenario: Phase dropdown display
- **WHEN** a manager views the Settings tab of the event dashboard
- **THEN** a section "Eventphase" SHALL be displayed
- **THEN** a dropdown SHALL list all phase choices plus an "Automatisch" option
- **THEN** the dropdown default SHALL be "Automatisch" when `manual_phase` is `null`

#### Scenario: Set manual phase
- **WHEN** a manager selects a phase from the dropdown (e.g. "Anmeldung offen")
- **THEN** the system SHALL call `PATCH /api/events/{slug}/` with `{manual_phase: "registration"}`
- **THEN** the event phase displayed across the dashboard SHALL update to the selected phase
- **THEN** a success toast "Phase wurde aktualisiert." SHALL be displayed

#### Scenario: Reset to automatic phase
- **WHEN** a manager selects "Automatisch" from the dropdown
- **THEN** the system SHALL call `PATCH /api/events/{slug}/` with `{manual_phase: null}`
- **THEN** the event phase SHALL revert to the automatically computed value

### Requirement: Warning when manual phase differs from computed phase
A warning SHALL be displayed when the manually set phase does not match the automatically computed phase.

#### Scenario: Phase mismatch warning
- **WHEN** a manager has set a manual phase
- **AND** the manual phase differs from what `compute_phase()` would return without the override
- **THEN** a warning banner SHALL be displayed below the dropdown with the text: "Die manuelle Phase ({manual_phase_label}) weicht von der automatisch berechneten Phase ({computed_phase_label}) ab."

#### Scenario: No warning when phases match
- **WHEN** a manager has set a manual phase
- **AND** the manual phase matches what `compute_phase()` would return automatically
- **THEN** no warning SHALL be displayed

#### Scenario: No warning in automatic mode
- **WHEN** `manual_phase` is `null` (automatic mode)
- **THEN** no warning SHALL be displayed
