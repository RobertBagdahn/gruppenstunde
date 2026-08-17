## ADDED Requirements

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
