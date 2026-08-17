## MODIFIED Requirements

### Requirement: Unified search across all content types
The search service SHALL search across all content types (GroupSession, Blog, Game, Recipe) instead of only Ideas and Recipes. The search SHALL use the same hybrid approach (fulltext + pgvector + filters) but query all content tables.

#### Scenario: Cross-type search
- **WHEN** GET `/api/search/?q=feuer`
- **THEN** results SHALL include matches from GroupSession, Blog, Game, and Recipe tables
- **THEN** results SHALL be merged by relevance score
- **THEN** each result SHALL include a content_type field

#### Scenario: Type-filtered search
- **WHEN** GET `/api/search/?q=feuer&type=game`
- **THEN** only Game results SHALL be returned

### Requirement: Search autocomplete across all types
The autocomplete endpoint SHALL return suggestions from all content types with type indicators.

#### Scenario: Autocomplete with type badges
- **WHEN** GET `/api/search/autocomplete/?q=feu`
- **THEN** suggestions SHALL include results from all content types
- **THEN** each suggestion SHALL have a content_type label and icon

## REMOVED Requirements

### Requirement: Idea-only search endpoint
**Reason**: Replaced by unified search across all content types
**Migration**: `/api/ideas/search/` is replaced by `/api/search/`

### Requirement: Idea-only autocomplete
**Reason**: Replaced by unified autocomplete
**Migration**: `/api/ideas/autocomplete/` is replaced by `/api/search/autocomplete/`
