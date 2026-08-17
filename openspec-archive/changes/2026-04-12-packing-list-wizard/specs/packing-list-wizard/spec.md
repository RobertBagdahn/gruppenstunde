## ADDED Requirements

### Requirement: Wizard page at /packing-lists/new
The system SHALL provide a wizard page at `/packing-lists/new` that guides authenticated users through creating a context-based packing list.

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user navigates to `/packing-lists/new`
- **THEN** the system SHALL redirect to the login page

#### Scenario: Wizard page loads
- **WHEN** an authenticated user navigates to `/packing-lists/new`
- **THEN** the system SHALL display a two-phase wizard interface
- **THEN** Phase 1 SHALL show activity type selection as a grid of tappable chips
- **THEN** the page SHALL also show a "Leere Liste erstellen" escape-hatch option

### Requirement: Activity type selection (Phase 1)
The wizard SHALL present the following activity types as selectable chips: Zeltlager, Hausfahrt, Tageswanderung, Radtour, Kanutour, Stadtfahrt, Hajk, Gruppenstunde.

#### Scenario: User selects an activity type
- **WHEN** the user taps an activity type chip
- **THEN** Phase 2 SHALL animate into view below the selection
- **THEN** the selected chip SHALL be visually highlighted

#### Scenario: User changes activity type
- **WHEN** the user taps a different activity type chip
- **THEN** the previously selected chip SHALL be deselected
- **THEN** Phase 2 SHALL update to reflect the new selection

### Requirement: Detail selection (Phase 2)
After selecting an activity type, the wizard SHALL display three additional chip groups for duration, season, and age group.

#### Scenario: Duration selection
- **WHEN** Phase 2 is displayed
- **THEN** the system SHALL show duration chips: "1 Tag", "Wochenende", "1 Woche", "2+ Wochen"
- **THEN** the user SHALL be able to select exactly one duration

#### Scenario: Season selection
- **WHEN** Phase 2 is displayed
- **THEN** the system SHALL show season chips: "Sommer", "Winter", "Übergang"
- **THEN** the user SHALL be able to select exactly one season

#### Scenario: Age group selection
- **WHEN** Phase 2 is displayed
- **THEN** the system SHALL show age group chips: "Wölflinge", "Jungpfadfinder", "Pfadfinder", "Rover"
- **THEN** the user SHALL be able to select exactly one age group
- **THEN** age group selection SHALL be optional (default: no filter)

### Requirement: Title input with auto-suggestion
The wizard SHALL display a title input field in Phase 2 with an auto-generated suggestion based on the user's context selection.

#### Scenario: Title auto-suggestion
- **WHEN** the user has selected activity type "Zeltlager", season "Sommer", and duration "1 Woche"
- **THEN** the title field SHALL show a placeholder like "Sommer-Zeltlager 2026"
- **THEN** the user SHALL be able to override the suggestion with custom text

#### Scenario: Title required for submission
- **WHEN** the title field is empty and no auto-suggestion is active
- **THEN** the "Packliste erstellen" button SHALL be disabled

### Requirement: Live preview of generated list
The wizard SHALL display a live preview showing the expected result of the current context selection.

#### Scenario: Preview updates on context change
- **WHEN** the user changes any context selection (activity, duration, season, age group)
- **THEN** the preview SHALL update within 500ms showing: number of categories, number of items, and category names
- **THEN** the preview SHALL be fetched from `POST /api/packing-lists/preview/`

#### Scenario: Preview loading state
- **WHEN** the preview is being fetched
- **THEN** a subtle loading indicator SHALL be displayed (skeleton or spinner)

### Requirement: Generate packing list via API
The system SHALL provide a `POST /api/packing-lists/generate/` endpoint that creates a packing list with dynamically selected items.

#### Scenario: Successful generation
- **WHEN** an authenticated user sends `POST /api/packing-lists/generate/` with `{ title, context: { activity, duration, season, age_group } }`
- **THEN** the system SHALL create a new PackingList with the given title
- **THEN** the system SHALL populate it with categories and items matching the context via the Builder algorithm
- **THEN** the system SHALL store the context on the PackingList model
- **THEN** the system SHALL return the full PackingList response (same schema as `GET /{id}/`)

#### Scenario: Missing required fields
- **WHEN** the request is missing `title`, `context.activity`, `context.duration`, or `context.season`
- **THEN** the system SHALL return 422 with validation errors

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user sends `POST /api/packing-lists/generate/`
- **THEN** the system SHALL return 401

### Requirement: Preview endpoint
The system SHALL provide a `POST /api/packing-lists/preview/` endpoint that returns a preview of what the Builder would generate without creating any database records.

#### Scenario: Successful preview
- **WHEN** an authenticated user sends `POST /api/packing-lists/preview/` with `{ context: { activity, duration, season, age_group } }`
- **THEN** the system SHALL return `{ categories: [{ name, item_count }], total_items }` without creating any records

### Requirement: Preset quick-selection
The wizard SHALL display preset cards that represent common context combinations (e.g., "Sommerlager", "Winter-Hajk").

#### Scenario: Presets displayed
- **WHEN** the wizard page loads
- **THEN** preset cards SHALL be displayed above or alongside the activity type selection
- **THEN** each preset SHALL show a name, icon, and brief description

#### Scenario: Selecting a preset
- **WHEN** the user taps a preset card
- **THEN** the wizard SHALL auto-fill all context fields (activity, duration, season, age_group) with the preset's values
- **THEN** Phase 2 SHALL be displayed with the pre-filled selections highlighted

### Requirement: Presets API
The system SHALL provide a `GET /api/packing-lists/presets/` endpoint that returns available wizard presets.

#### Scenario: Fetching presets
- **WHEN** a user sends `GET /api/packing-lists/presets/`
- **THEN** the system SHALL return an array of presets, each with: `name`, `icon`, `description`, `context: { activity, duration, season, age_group }`

### Requirement: Empty list escape-hatch
The wizard SHALL allow creating an empty packing list without context selection.

#### Scenario: Creating empty list
- **WHEN** the user clicks "Leere Liste erstellen"
- **THEN** the system SHALL show a minimal form with only a title input
- **THEN** submitting SHALL call `POST /api/packing-lists/` (existing endpoint) and redirect to `/packing-lists/{id}`

### Requirement: Wizard redirects to detail page
After successful packing list generation, the wizard SHALL redirect to the detail page.

#### Scenario: Redirect after generation
- **WHEN** the `POST /api/packing-lists/generate/` call succeeds
- **THEN** the wizard SHALL navigate to `/packing-lists/{id}` where `{id}` is the created list's ID
- **THEN** a success toast SHALL be shown: "Packliste erstellt"
