## ADDED Requirements

### Requirement: Publish readiness checklist API
A `GET /api/events/{slug}/checklist/` endpoint SHALL return the current checklist state for the event.

#### Scenario: Checklist response structure
- **WHEN** GET `/api/events/{slug}/checklist/`
- **THEN** the response SHALL include a `required` list and an `optional` list
- **THEN** each item SHALL have: `key` (string), `label` (string, German), `is_complete` (boolean), `link` (string, relative path to relevant setting/tab)
- **THEN** the response SHALL include `progress` (float, 0.0–1.0) computed from required items only

#### Scenario: Required checklist items
- **WHEN** GET `/api/events/{slug}/checklist/`
- **THEN** the `required` list SHALL contain exactly these items:
  1. `name_set` — "Name ist gesetzt" (complete when event name is non-empty)
  2. `dates_set` — "Start- und Enddatum sind gesetzt" (complete when both `start_date` and `end_date` are non-null)
  3. `booking_option_exists` — "Mindestens eine Buchungsoption vorhanden" (complete when at least one BookingOption exists)
  4. `registration_start_set` — "Anmeldebeginn ist konfiguriert" (complete when `registration_start` is non-null)
  5. `location_or_description` — "Ort oder Beschreibung vorhanden" (complete when `location` is non-null OR `description` is non-empty)

#### Scenario: Optional checklist items
- **WHEN** GET `/api/events/{slug}/checklist/`
- **THEN** the `optional` list SHALL contain these items:
  1. `invitation_text_written` — "Einladungstext ist geschrieben" (complete when `invitation_text` is non-empty)
  2. `invitees_added` — "Mindestens eine Gruppe oder Person eingeladen" (complete when at least one invitation exists)
  3. `packing_list_assigned` — "Packliste ist zugewiesen" (complete when a packing list is linked to the event)

#### Scenario: Only managers can access checklist
- **WHEN** GET `/api/events/{slug}/checklist/` by a non-manager
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Checklist is informational only
The checklist SHALL be purely informational and SHALL NOT block any actions such as publishing or transitioning phases.

#### Scenario: Incomplete checklist does not block publish
- **WHEN** a manager publishes an event with incomplete required checklist items
- **THEN** the publish action SHALL succeed regardless of checklist state

### Requirement: Checklist card in overview tab
The event overview tab SHALL display a checklist Card component showing the readiness state.

#### Scenario: Checklist card with progress bar
- **WHEN** a manager views the event overview tab
- **THEN** a "Veröffentlichungs-Checkliste" card SHALL be displayed
- **THEN** the card SHALL show a progress bar indicating the completion percentage of required items

#### Scenario: Required items display
- **WHEN** a manager views the checklist card
- **THEN** each required item SHALL be displayed with a green checkmark icon if complete or a red circle icon if incomplete
- **THEN** each incomplete item SHALL be a clickable link navigating to the relevant setting or tab

#### Scenario: Optional items display
- **WHEN** a manager views the checklist card
- **THEN** optional items SHALL be displayed below the required items with a yellow/info indicator if incomplete
- **THEN** complete optional items SHALL show a green checkmark icon

#### Scenario: All items complete
- **WHEN** all required items are complete
- **THEN** the progress bar SHALL show 100%
- **THEN** an additional text "Bereit zur Veröffentlichung" SHALL be displayed

#### Scenario: Checklist not shown to non-managers
- **WHEN** a non-manager views the event overview tab
- **THEN** the checklist card SHALL NOT be displayed
