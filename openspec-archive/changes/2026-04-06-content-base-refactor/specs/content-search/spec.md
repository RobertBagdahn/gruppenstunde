## ADDED Requirements

### Requirement: Unified Global Search
The system SHALL provide a unified search endpoint that searches across all content types (GroupSession, Blog, Game, Recipe). The search SHALL use hybrid matching: PostgreSQL full-text search (pg_trgm) for text relevance and pgvector cosine similarity for semantic matching.

#### Scenario: Searching across all content types
- **WHEN** GET `/api/search/?q=feuer`
- **THEN** the system SHALL search all content tables (session, blog, game, recipe)
- **THEN** results SHALL be merged and sorted by combined relevance score
- **THEN** only content with status='approved' and deleted_at IS NULL SHALL be included
- **THEN** response SHALL include content_type discriminator for each result

#### Scenario: Filtering by content type
- **WHEN** GET `/api/search/?q=feuer&type=session`
- **THEN** only GroupSession results SHALL be returned

#### Scenario: Empty search returns popular content
- **WHEN** GET `/api/search/` without a query
- **THEN** the system SHALL return popular/recent approved content across all types

### Requirement: Search Tab UI
The frontend search page SHALL display a horizontal tab bar above results with tabs: "Alle", "Ideen", "Rezepte", "Spiele", "Blog". Each tab SHALL show the result count in parentheses. Tabs SHALL be color-coded according to the tool color scheme.

#### Scenario: Tab navigation
- **WHEN** a user clicks the "Spiele" tab
- **THEN** the URL SHALL update to `/search?q=...&type=game`
- **THEN** only Game results SHALL be displayed
- **THEN** the "Spiele" tab SHALL be visually active

#### Scenario: Tab counts
- **WHEN** search results are loaded
- **THEN** each tab SHALL display the count of matching results for that content type
- **THEN** the "Alle" tab SHALL show the total count across all types

### Requirement: Unified Autocomplete
The system SHALL provide a typeahead autocomplete endpoint that returns suggestions from all content types as the user types in the search bar.

#### Scenario: Autocomplete suggestions
- **WHEN** GET `/api/search/autocomplete/?q=feu`
- **THEN** the system SHALL return up to 8 suggestions from all content types
- **THEN** each suggestion SHALL include title, content_type, and slug
- **THEN** suggestions SHALL be grouped by content type with type labels

### Requirement: Ingredient standalone food in recipe search
Ingredients with `is_standalone_food=True` SHALL appear in recipe search results as a special category "Einzelzutat". These SHALL be displayed with a distinct badge.

#### Scenario: Raw edible ingredient in search
- **WHEN** a user searches for recipes and an Ingredient with is_standalone_food=True matches
- **THEN** the ingredient SHALL appear in results with a "Einzelzutat" badge
- **THEN** clicking the result SHALL navigate to the ingredient detail page
