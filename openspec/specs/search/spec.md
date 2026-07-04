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

## REMOVED Requirements

### Requirement: Idea-only search endpoint
**Reason**: Replaced by unified search across all content types
**Migration**: `/api/ideas/search/` is replaced by `/api/search/`

### Requirement: Idea-only autocomplete
**Reason**: Replaced by unified autocomplete
**Migration**: `/api/ideas/autocomplete/` is replaced by `/api/search/autocomplete/`

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

### Requirement: Search logging for recipe and ingredient endpoints

The search logging subsystem SHALL also log queries from the recipe list endpoint (`GET /api/recipes/?q=...`) and the ingredient list endpoint (`GET /api/ingredients/?name=...`), in addition to the existing unified search endpoint. Each log entry SHALL follow the same `SearchLog` schema (query, results_count, user). A `source` discriminator SHALL distinguish log entries by origin endpoint.

#### Scenario: Recipe query logged via SearchLog

- **WHEN** `GET /api/recipes/?q=Pfannkuchen` is called
- **THEN** a `SearchLog` entry SHALL be created with the query `"Pfannkuchen"` and the result count

#### Scenario: Ingredient query logged via SearchLog

- **WHEN** `GET /api/ingredients/?name=Mehl` is called
- **THEN** a `SearchLog` entry SHALL be created with the query `"Mehl"` and the result count

#### Scenario: Structured log output to stdout

- **WHEN** any search endpoint logs a query
- **THEN** a structured JSON log line SHALL be written to stdout with fields `event`, `query`, `results_count`, `user_id`, `timestamp`, `source`


---

# Content Search

## Requirements

### Requirement: Unified Global Search
The system SHALL provide a unified search endpoint that searches across all content types (GroupSession, Blog, Game, Recipe, Event). The search SHALL use hybrid matching: PostgreSQL full-text search (pg_trgm) for text relevance and pgvector cosine similarity for semantic matching. The endpoint SHALL accept an optional `scope` query parameter with values `all` (default) or `mine` that restricts results to content related to the authenticated user. Event results SHALL always exclude items with `is_template=True`.

#### Scenario: Searching across all content types (default scope)
- **WHEN** GET `/api/content/search/?q=feuer`
- **THEN** the system SHALL search all content tables (session, blog, game, recipe, event)
- **THEN** results SHALL be merged and sorted by combined relevance score
- **THEN** only content with `status='approved'` and `deleted_at IS NULL` SHALL be included
- **THEN** Event results SHALL exclude items with `is_template=True`
- **THEN** response SHALL include `content_type` discriminator for each result

#### Scenario: Filtering by content type
- **WHEN** GET `/api/content/search/?q=feuer&type=session`
- **THEN** only GroupSession results SHALL be returned

#### Scenario: Empty search returns popular content
- **WHEN** GET `/api/content/search/` without a query
- **THEN** the system SHALL return popular/recent approved content across all types

### Requirement: Mine-scope filter for search
The search endpoint SHALL support a `scope=mine` parameter that restricts results to content related to the authenticated user. The semantics SHALL be content-type-specific and cover ownership, authorship, invitation, responsibility, and registration. When `scope=mine` is set, the status filter SHALL be relaxed so that DRAFT items owned by the user are included.

#### Scenario: Mine scope for session/blog/game
- **WHEN** GET `/api/content/search/?q=&scope=mine&type=session` with an authenticated user
- **THEN** only GroupSession items SHALL be returned where the user is either `created_by` OR listed in `authors`
- **THEN** items with `status='draft'` SHALL be included if the user matches the ownership criteria
- **THEN** the same logic SHALL apply for `type=blog` (created_by OR authors) and `type=game` (created_by OR authors)

#### Scenario: Mine scope for recipe
- **WHEN** GET `/api/content/search/?q=&scope=mine&type=recipe` with an authenticated user
- **THEN** only Recipe items SHALL be returned where the user is either `owner` OR listed in `authors`
- **THEN** draft recipes owned by the user SHALL be included

#### Scenario: Mine scope for event (comprehensive relation set)
- **WHEN** GET `/api/content/search/?q=&scope=mine&type=event` with an authenticated user
- **THEN** Event items SHALL be returned where any of the following is true:
  - the user equals `created_by`
  - the user is in `responsible_persons` M2M
  - the user is in `invited_users` M2M
  - at least one group of `invited_groups` M2M is also in the user's groups
  - a `Registration` row exists linking the event to the user (any status)
- **THEN** the response SHALL deduplicate events that match multiple criteria (`.distinct()`)
- **THEN** events with `is_template=True` SHALL be excluded

#### Scenario: Mine scope across all types
- **WHEN** GET `/api/content/search/?q=&scope=mine` without a type filter
- **THEN** the per-type mine semantics SHALL be applied independently for each type
- **THEN** results SHALL be merged and sorted by relevance as with normal search

#### Scenario: Mine scope for anonymous user
- **WHEN** GET `/api/content/search/?q=&scope=mine` without an authenticated session
- **THEN** the endpoint SHALL ignore the `scope` parameter and behave as `scope=all`
- **THEN** the frontend SHALL NOT surface the mine-toggle to anonymous users

#### Scenario: Draft leak protection
- **WHEN** user A requests `/api/content/search/?scope=mine`
- **THEN** the response SHALL NOT include draft items owned by user B
- **THEN** backend tests SHALL verify that draft visibility is strictly scoped to `request.user`

### Requirement: Frontend mine-toggle on SearchPage
The SearchPage SHALL display a toggle switch labelled "Nur meine Beiträge" that controls the `scope` URL parameter. The toggle SHALL only be visible for authenticated users and SHALL default to off.

#### Scenario: Authenticated user toggles mine
- **WHEN** an authenticated user visits `/search?q=feuer`
- **THEN** a `Switch` with label "Nur meine Beiträge" SHALL be rendered in the filter bar
- **WHEN** the user enables the switch
- **THEN** the URL SHALL update to `/search?q=feuer&scope=mine`
- **THEN** the result list SHALL refetch and show only mine-scoped results

#### Scenario: Switch state reflects URL
- **WHEN** the URL is `/search?q=feuer&scope=mine`
- **THEN** the switch SHALL be rendered in the ON state on initial load

#### Scenario: Anonymous user does not see the toggle
- **WHEN** an anonymous visitor loads `/search?q=feuer`
- **THEN** the mine-toggle SHALL NOT be rendered
- **THEN** any `scope=mine` in the URL SHALL be ignored by the frontend and not passed to the API

#### Scenario: Draft items visible with badge
- **WHEN** `scope=mine` is active and a returned item has `status='draft'`
- **THEN** the result card SHALL display an "Entwurf" badge
- **THEN** clicking the item SHALL navigate to the normal detail page (existing draft-view behaviour)

### Requirement: Search Tab UI
The frontend search page SHALL display a horizontal tab bar above results with tabs: "Alle", "Gruppenstunden", "Rezepte", "Spiele", "Blog". Each tab SHALL show the result count in parentheses. Tabs SHALL be color-coded according to the tool color scheme.

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
- **WHEN** GET `/api/content/autocomplete/?q=feu`
- **THEN** the system SHALL return up to 8 suggestions from all content types
- **THEN** each suggestion SHALL include title, content_type, and slug
- **THEN** suggestions SHALL be grouped by content type with type labels

## Planned Features

### Planned: Ingredient standalone food in recipe search
Ingredients with a future `is_standalone_food=True` field SHALL appear in recipe search results as a special category "Einzelzutat". This feature requires adding the `is_standalone_food` BooleanField to the Ingredient model first.

#### Scenario: Raw edible ingredient in search
- **WHEN** a user searches for recipes and an Ingredient with is_standalone_food=True matches
- **THEN** the ingredient SHALL appear in results with a "Einzelzutat" badge
- **THEN** clicking the result SHALL navigate to the ingredient detail page


---

# Command Palette

# command-palette Specification

## Purpose

Spezifikation für die globale Command Palette (Cmd+K / Ctrl+K) der Inspi-Plattform. Ermöglicht schnelle Suche und Navigation über die gesamte Anwendung.

## Context

- **Frontend**: React 18, TypeScript (strict), shadcn/ui Command (cmdk-based)
- **API**: Nutzt bestehenden `/api/content/search/autocomplete/` Endpunkt
- **Querschnittsthema**: Global verfügbar über alle Seiten

## Requirements

### Requirement: Command palette overlay

The frontend SHALL provide a command palette overlay that allows users to search content and navigate pages via keyboard shortcut.

#### Scenario: Opening the command palette
- **WHEN** a user presses `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux)
- **THEN** a centered dialog overlay SHALL appear with a search input auto-focused
- **THEN** the background SHALL be dimmed
- **THEN** the dialog SHALL be built using shadcn/ui `Command` component (cmdk-based)

#### Scenario: Closing the command palette
- **WHEN** the command palette is open
- **THEN** pressing `Escape` SHALL close it
- **THEN** clicking outside the dialog SHALL close it
- **THEN** selecting a result SHALL close it and navigate to the target

#### Scenario: Searching content
- **WHEN** a user types a query in the command palette search input
- **THEN** results SHALL be fetched from the existing `/api/content/search/autocomplete/` endpoint
- **THEN** results SHALL be grouped by content type (Gruppenstunden, Spiele, Rezepte, Wissensbeitraege)
- **THEN** each result SHALL show the title and content type icon
- **THEN** results SHALL update as the user types (debounced at 300ms)

#### Scenario: Quick navigation actions
- **WHEN** the command palette is opened with an empty search input
- **THEN** a "Schnellaktionen" (Quick Actions) section SHALL be displayed
- **THEN** quick actions SHALL include: "Neues Spiel erstellen", "Neues Rezept erstellen", "Neue Gruppenstunde erstellen", "Neuen Wissensbeitrag erstellen"
- **THEN** a "Seiten" (Pages) section SHALL list main navigation destinations

#### Scenario: Recent searches
- **WHEN** the command palette is opened
- **THEN** if the user has previous searches stored in localStorage
- **THEN** a "Letzte Suchen" (Recent Searches) section SHALL display the last 5 search queries
- **THEN** clicking a recent search SHALL execute that search

#### Scenario: Keyboard navigation within palette
- **WHEN** the command palette shows results
- **THEN** arrow keys (Up/Down) SHALL navigate between results
- **THEN** `Enter` SHALL select the highlighted result
- **THEN** the currently highlighted result SHALL have a visible background highlight

#### Scenario: No results found
- **WHEN** a search query returns no results
- **THEN** the palette SHALL display "Keine Ergebnisse fuer '{query}'" text
- **THEN** the "Seiten" section SHALL still be visible for navigation

#### Scenario: Mobile trigger
- **WHEN** the viewport is mobile (< 640px)
- **THEN** the command palette SHALL be triggerable via a search icon button in the header/navigation
- **THEN** the palette SHALL render as a full-width bottom sheet or full-screen overlay on mobile
- **THEN** the keyboard shortcut SHALL still work if a physical keyboard is connected

#### Scenario: Command palette does not conflict with form inputs
- **WHEN** a user is focused on a text input, textarea, or contenteditable element
- **THEN** pressing `Cmd+K`/`Ctrl+K` SHALL NOT open the command palette
- **THEN** the browser's default behavior SHALL be preserved

## Betroffene Dateien

| Datei | Relevanz |
|-------|----------|
| `frontend/src/components/shared/CommandPalette.tsx` | Command palette component |
| `frontend/src/hooks/useCommandPalette.ts` | Global keyboard shortcut hook |
| `frontend/src/lib/recentSearches.ts` | Recent searches localStorage utility |
| `frontend/src/components/ui/command.tsx` | shadcn/ui Command component (cmdk) |
| `frontend/src/components/Layout.tsx` | Global integration + mobile search trigger |
