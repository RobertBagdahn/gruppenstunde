## Requirements

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
