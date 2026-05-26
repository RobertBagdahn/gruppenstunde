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

---

## Unified Catalog

### Requirement: Single Unified Catalog
The system SHALL maintain a single item catalog (`UNIFIED_CATALOG`) in `backend/packinglist/services/suggestion_service.py` that serves as the sole source of truth for all packing list item data. The existing `CATEGORIES` dict in `seed_packing_lists.py` and `SUGGESTION_CATALOG` dict in `suggestion_service.py` SHALL be merged into this single catalog.

#### Scenario: Catalog structure
- **WHEN** the Unified Catalog is defined
- **THEN** it SHALL be a Python dict mapping category names to lists of item tuples
- **THEN** each item tuple SHALL have 5 elements: `(name, quantity, description, tags, is_do_not_bring)`
- **THEN** `tags` SHALL be a list of strings
- **THEN** `is_do_not_bring` SHALL be a boolean (default False)

#### Scenario: Catalog contains all items from both sources
- **WHEN** the Unified Catalog is created
- **THEN** it SHALL contain all items from the previous Suggestion Catalog (~240 items)
- **THEN** it SHALL contain all items from the previous Seed Catalog that were not already in the Suggestion Catalog (~10 additional items from Hausfahrt, Verpflegung, Länger als 3 Tage)
- **THEN** duplicate items SHALL be resolved in favor of the Suggestion Catalog version (better descriptions, tags)

### Requirement: Extended tag system with priority tags
Every item in the Unified Catalog SHALL have a priority tag that controls its inclusion behavior in the dynamic Builder.

#### Scenario: Priority tags
- **WHEN** an item is tagged
- **THEN** it SHALL have exactly one of these priority tags: `basis`, `standard`, `erweitert`
- **THEN** `basis` items SHALL be included regardless of context match (universally needed items like Zahnbürste, Schlafsack)
- **THEN** `standard` items SHALL be included when at least one context tag matches the user's selection
- **THEN** `erweitert` items SHALL be included only for longer durations (1-woche, 2-wochen-plus) and when a context tag matches

#### Scenario: Items without explicit priority tag
- **WHEN** an item has no priority tag
- **THEN** it SHALL be treated as `standard`

### Requirement: Context tags for activity types
Items in the Unified Catalog SHALL support context tags for activity types.

#### Scenario: Activity type tags
- **WHEN** an item is relevant to specific activity types
- **THEN** it SHALL be tagged with one or more of: `zeltlager`, `hausfahrt`, `tageswanderung`, `radtour`, `kanutour`, `stadtfahrt`, `hajk`, `gruppenstunde`

### Requirement: Context tags for duration
Items in the Unified Catalog SHALL support context tags for trip duration.

#### Scenario: Duration tags
- **WHEN** an item is relevant to specific trip durations
- **THEN** it SHALL be tagged with one or more of: `1-tag`, `wochenende`, `1-woche`, `2-wochen-plus`

### Requirement: Context tags for season
Items in the Unified Catalog SHALL support context tags for seasons.

#### Scenario: Season tags
- **WHEN** an item is relevant to specific seasons
- **THEN** it SHALL be tagged with one or more of: `sommer`, `winter`, `uebergang`

### Requirement: Context tags for age groups
Items in the Unified Catalog SHALL support context tags for scout age groups.

#### Scenario: Age group tags
- **WHEN** an item is relevant to specific age groups
- **THEN** it SHALL be tagged with one or more of: `woelflinge`, `jufis`, `pfadis`, `rover`

### Requirement: Exclusion tags
Items in the Unified Catalog SHALL support exclusion tags that prevent inclusion for specific contexts.

#### Scenario: Exclusion tag format
- **WHEN** an item should be excluded for a specific context
- **THEN** it SHALL be tagged with the context tag prefixed by `!` (e.g., `!woelflinge`, `!1-tag`)

#### Scenario: Exclusion tag behavior
- **WHEN** the Builder processes an item with `!woelflinge`
- **THEN** the item SHALL be excluded when the user's age group selection is `woelflinge`
- **THEN** the item SHALL be included for all other age groups (if other conditions are met)

### Requirement: Builder algorithm
The system SHALL implement a `build_dynamic_list()` function that takes a context dict and returns matching categories with items.

#### Scenario: Builder filters by exclusion first
- **WHEN** the Builder processes an item
- **THEN** it SHALL first check exclusion tags against the user's context
- **THEN** if any exclusion tag matches, the item SHALL be skipped regardless of other tags

#### Scenario: Builder includes basis items
- **WHEN** the Builder processes an item with priority tag `basis`
- **THEN** the item SHALL be included regardless of context match (after exclusion check)

#### Scenario: Builder includes standard items by context
- **WHEN** the Builder processes an item with priority tag `standard`
- **THEN** the item SHALL be included only if at least one of its context tags matches the user's selection

#### Scenario: Builder includes erweitert items for long trips
- **WHEN** the Builder processes an item with priority tag `erweitert`
- **THEN** the item SHALL be included only if the user's duration is `1-woche` or `2-wochen-plus` AND at least one context tag matches

#### Scenario: Builder removes empty categories
- **WHEN** the Builder has processed all items in a category
- **THEN** the category SHALL be excluded from the result if it contains zero matching items

#### Scenario: Builder returns structured result
- **WHEN** the Builder completes processing
- **THEN** it SHALL return a dict of `{ category_name: [items] }` preserving the catalog's category order

### Requirement: Catalog consistency
The Unified Catalog SHALL use consistent category names across all consumers (Wizard, Suggestions, Autocomplete).

#### Scenario: Category name consistency
- **WHEN** the Suggestion service references a category name (e.g., for random suggestions)
- **THEN** the category name SHALL match exactly with the Unified Catalog category names
- **THEN** category names SHALL use the longer, more descriptive form (e.g., "Kulturbeutel / Hygiene" not "Kulturbeutel")
