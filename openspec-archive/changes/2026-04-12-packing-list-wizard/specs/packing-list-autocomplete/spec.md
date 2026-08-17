## ADDED Requirements

### Requirement: Autocomplete dropdown in item input
The system SHALL display an autocomplete dropdown when the user types in the "Gegenstand hinzufügen" input field within a packing list category.

#### Scenario: Typing triggers autocomplete
- **WHEN** the user types at least 2 characters in the item input field
- **THEN** the system SHALL display a dropdown with matching items from the Unified Catalog
- **THEN** matching SHALL be case-insensitive against item name and tags
- **THEN** the dropdown SHALL show a maximum of 8 matches

#### Scenario: Match display format
- **WHEN** autocomplete matches are displayed
- **THEN** each match SHALL show: item name, quantity hint (if available)
- **THEN** items already in the current packing list SHALL be shown as disabled with "(bereits vorhanden)" label

#### Scenario: Selecting an autocomplete match
- **WHEN** the user clicks or selects a match from the dropdown
- **THEN** the item SHALL be created in the current category
- **THEN** the quantity SHALL be pre-filled from the catalog's quantity hint
- **THEN** the description SHALL be pre-filled from the catalog's description
- **THEN** the input field SHALL be cleared for the next entry

#### Scenario: Creating a custom item
- **WHEN** the user types a name that has no exact match and presses Enter
- **THEN** the item SHALL be created as a plain text item (current behavior preserved)
- **THEN** the dropdown SHALL show a "als neuen Gegenstand anlegen" option at the bottom

#### Scenario: Dismissing autocomplete
- **WHEN** the user presses Escape or clicks outside the dropdown
- **THEN** the dropdown SHALL close without adding an item

#### Scenario: Keyboard navigation
- **WHEN** the autocomplete dropdown is open
- **THEN** the user SHALL be able to navigate matches with Arrow Up/Down keys
- **THEN** pressing Enter SHALL select the highlighted match
- **THEN** pressing Enter with no match highlighted SHALL create a custom item

### Requirement: Client-side catalog loading for autocomplete
The full Unified Catalog SHALL be loaded client-side for instant autocomplete filtering.

#### Scenario: Catalog loaded on detail page mount
- **WHEN** the PackingListDetailPage mounts
- **THEN** the system SHALL fetch the full catalog via `GET /api/packing-lists/catalog/`
- **THEN** the catalog SHALL be cached with TanStack Query (staleTime: 1 hour)

#### Scenario: Catalog response format
- **WHEN** the catalog endpoint is called
- **THEN** the response SHALL contain all items as a flat array: `{ items: [{ name, quantity, description, category, tags }] }`
- **THEN** the response SHALL NOT include `is_do_not_bring` items (those are added intentionally, not via autocomplete)

### Requirement: Full catalog API endpoint
The system SHALL provide a `GET /api/packing-lists/catalog/` endpoint returning all items from the Unified Catalog.

#### Scenario: Fetching the full catalog
- **WHEN** a user sends `GET /api/packing-lists/catalog/`
- **THEN** the system SHALL return all catalog items grouped or as a flat list
- **THEN** this endpoint SHALL NOT require authentication (catalog data is not sensitive)
