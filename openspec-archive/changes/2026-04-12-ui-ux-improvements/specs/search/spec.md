## ADDED Requirements

### Requirement: Command palette as search entry point

The search system SHALL provide an additional entry point via a command palette (Cmd+K / Ctrl+K) that uses the existing autocomplete API endpoint.

#### Scenario: Command palette triggers autocomplete search
- **WHEN** a user types a query in the command palette
- **THEN** the existing `/api/content/search/autocomplete/` endpoint SHALL be called
- **THEN** results SHALL be displayed grouped by content type within the palette
- **THEN** selecting a result SHALL navigate directly to the content detail page

#### Scenario: Command palette complements SearchPage
- **WHEN** a user searches via the command palette
- **THEN** pressing Enter without selecting a specific result SHALL navigate to the SearchPage with the query pre-filled as `?q={query}`
- **THEN** the full SearchPage with filters, sorting, and pagination remains the primary search experience
