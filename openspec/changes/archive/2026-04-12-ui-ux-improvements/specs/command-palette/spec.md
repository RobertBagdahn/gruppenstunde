## ADDED Requirements

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
