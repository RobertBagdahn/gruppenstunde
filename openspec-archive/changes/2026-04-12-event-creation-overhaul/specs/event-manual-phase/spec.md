## ADDED Requirements

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
