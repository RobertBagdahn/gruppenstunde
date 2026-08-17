## MODIFIED Requirements

### Requirement: Unified search across all content types
The search service SHALL search across content types (GroupSession, Blog, Game, Recipe, Event) but SHALL NOT include Tags in search results. The search SHALL use the same hybrid approach (fulltext + pgvector + filters) but SHALL NOT query the Tag table for search results. Tags SHALL remain available only through the autocomplete endpoint.

#### Scenario: Cross-type search excludes tags
- **WHEN** GET `/api/content/search/?q=frühstück`
- **THEN** results SHALL include matches from GroupSession, Blog, Game, Recipe, and Event tables
- **THEN** results SHALL NOT include any items with `result_type: "tag"`
- **THEN** `type_counts` in the response SHALL NOT contain a `tag` key

#### Scenario: Type-filtered search does not accept tag type
- **WHEN** GET `/api/content/search/?q=feuer&result_types=tag`
- **THEN** the response SHALL return zero results (tag is not a valid search result type)

### Requirement: Search autocomplete across all types
The autocomplete endpoint SHALL continue to return suggestions from all content types including Tags with type indicators.

#### Scenario: Autocomplete still includes tags
- **WHEN** GET `/api/content/search/autocomplete/?q=frü`
- **THEN** suggestions SHALL include results from all content types including Tags
- **THEN** each suggestion SHALL have a `result_type` field, and tag suggestions SHALL have `result_type: "tag"`

### Requirement: Search result type tabs
The frontend search page SHALL display filter tabs only for content types that appear in search results. The Tags tab SHALL NOT be displayed.

#### Scenario: Tab bar without tags
- **WHEN** the search page is loaded
- **THEN** the tab bar SHALL display tabs for: Alle, Gruppenstunden, Wissensbeiträge, Spiele, Rezepte, Events
- **THEN** the tab bar SHALL NOT display a "Tags" tab
