## ADDED Requirements

### Requirement: Event template flag
Events SHALL support being marked as templates via an `is_template: BooleanField` on the Event model. Template events serve as copy sources and are never published.

#### Scenario: Mark event as template
- **WHEN** PATCH `/api/events/{slug}/` with `is_template: true`
- **THEN** the event SHALL be marked as a template
- **THEN** only managers of the event SHALL be able to set this flag

#### Scenario: Template events are excluded from public listings
- **WHEN** GET `/api/events/` (public/member event list)
- **THEN** events with `is_template: true` SHALL NOT appear in the results

#### Scenario: Template default value
- **WHEN** a new Event is created
- **THEN** `is_template` SHALL default to `false`

### Requirement: Template list endpoint
A dedicated endpoint `GET /api/events/templates/` SHALL return only template events owned by the current user, paginated.

#### Scenario: List own templates
- **WHEN** GET `/api/events/templates/?page=1&page_size=20`
- **THEN** the response SHALL return only events where `is_template: true` and the current user is a manager
- **THEN** the response SHALL use the standard paginated format: `{items, total, page, page_size, total_pages}`

#### Scenario: Unauthenticated user requests templates
- **WHEN** GET `/api/events/templates/` by an unauthenticated user
- **THEN** the response SHALL return 401 Unauthorized

### Requirement: Template section in event list UI
Template events SHALL appear in a separate "Vorlagen" section on the event list page.

#### Scenario: Templates displayed in dedicated section
- **WHEN** a user views the event list page and has template events
- **THEN** a "Vorlagen" section SHALL be displayed above or below the regular event list
- **THEN** each template SHALL show its name, creation date, and a "Duplizieren" action

#### Scenario: No templates exist
- **WHEN** a user views the event list page and has no template events
- **THEN** the "Vorlagen" section SHALL NOT be displayed

### Requirement: Event duplication endpoint
A `POST /api/events/{slug}/duplicate/` endpoint SHALL create a deep copy of the event. This route is nested under `/{event_slug}/` and MUST be defined AFTER the `/{event_slug}/` route (as a sub-route), which is the correct ordering.

#### Scenario: Duplicate event with all structural data
- **WHEN** POST `/api/events/{slug}/duplicate/`
- **THEN** the system SHALL create a new event copying all Event fields, BookingOptions, CustomFields, and Labels
- **THEN** the duplicated event SHALL always start in "draft" phase
- **THEN** the response SHALL return the newly created event with its new slug

#### Scenario: Duplicate event with date shift
- **WHEN** POST `/api/events/{slug}/duplicate/` with optional body `{ "date_shift_weeks": 52 }`
- **THEN** all date fields on the duplicated event (start_date, end_date, registration_start, registration_end, etc.) SHALL be shifted forward by the specified number of weeks
- **WHEN** POST `/api/events/{slug}/duplicate/` without `date_shift_weeks` or with `date_shift_weeks: null`
- **THEN** all date fields SHALL be set to `null` on the duplicate (clean slate)

#### Scenario: Duplicate event excludes transactional data
- **WHEN** POST `/api/events/{slug}/duplicate/`
- **THEN** the duplicated event SHALL NOT include Registrations, Participants, Payments, or Timeline entries

#### Scenario: Duplicated event slug generation
- **WHEN** POST `/api/events/{slug}/duplicate/` for an event with slug `sommerlager`
- **THEN** the new event SHALL receive the slug `sommerlager-copy`
- **WHEN** `sommerlager-copy` already exists
- **THEN** the new event SHALL receive the slug `sommerlager-copy-2` (incrementing)

#### Scenario: Only managers can duplicate
- **WHEN** POST `/api/events/{slug}/duplicate/` by a non-manager user
- **THEN** the response SHALL return 403 Forbidden

### Requirement: Template save button in event settings UI
The event settings SHALL include an "Als Vorlage speichern" button to mark the event as a template.

#### Scenario: Save as template via UI
- **WHEN** a manager clicks "Als Vorlage speichern" in event settings
- **THEN** the system SHALL set `is_template: true` on the event via PATCH
- **THEN** a confirmation message SHALL be shown

### Requirement: Duplicate button in event UI
A "Duplizieren" button SHALL be available in event settings and on the event card context menu.

#### Scenario: Duplicate from event settings
- **WHEN** a manager clicks "Duplizieren" in event settings
- **THEN** the system SHALL call `POST /api/events/{slug}/duplicate/`
- **THEN** the user SHALL be redirected to the newly created event

#### Scenario: Duplicate from event card context menu
- **WHEN** a manager right-clicks or opens the context menu on an event card and selects "Duplizieren"
- **THEN** the system SHALL call `POST /api/events/{slug}/duplicate/`
- **THEN** a success notification SHALL be shown with a link to the new event

### Requirement: Create from template in event wizard
The event creation wizard SHALL offer an "Aus Vorlage erstellen" option in step 1.

#### Scenario: Select template in wizard
- **WHEN** a user starts the event creation wizard
- **THEN** step 1 SHALL display an "Aus Vorlage erstellen" option alongside the blank event option
- **WHEN** the user selects "Aus Vorlage erstellen"
- **THEN** a list of available templates SHALL be shown (from `GET /api/events/templates/`)
- **WHEN** the user selects a template
- **THEN** the system SHALL duplicate the template via `POST /api/events/{slug}/duplicate/` and continue the wizard with the new event

#### Scenario: No templates available in wizard
- **WHEN** a user starts the event creation wizard and has no templates
- **THEN** the "Aus Vorlage erstellen" option SHALL be disabled or hidden

### Requirement: Event list excludes templates by default
The `GET /api/events/` endpoint MUST exclude template events by default, filtering with `is_template=False`. Templates are only accessible via the dedicated `GET /api/events/templates/` endpoint.

#### Scenario: Regular event list filters out templates
- **WHEN** GET `/api/events/`
- **THEN** the queryset SHALL include only events where `is_template=False`
- **THEN** template events SHALL never appear in the regular event listing
