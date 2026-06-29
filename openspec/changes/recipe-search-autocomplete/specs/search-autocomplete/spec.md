## ADDED Requirements

### Requirement: Recipe Search Dialog with Autocomplete

The "Rezept für Abendessen wählen"-dialog SHALL support text-based search with live autocomplete, showing mixed recipe and ingredient results with rich metadata.

#### Scenario: Search field at top of dialog
- **WHEN** the dialog opens
- **THEN** a search input field SHALL be displayed at the very top, above all other filter controls
- **AND** the placeholder SHALL read "Suchen..."
- **AND** no search query SHALL be active

#### Scenario: Debounced autocomplete search
- **WHEN** the user types 2 or more characters in the search field
- **THEN** after 300ms of inactivity, the system SHALL call the search API with `q` parameter
- **AND** the results list SHALL update with matching recipes and ingredients

#### Scenario: Minimum characters for search
- **WHEN** the search field has fewer than 2 characters
- **THEN** the system SHALL NOT make a search API call with `q`
- **AND** the default results (based on category pills) SHALL be displayed

#### Scenario: Mixed recipe and ingredient results
- **WHEN** search results contain both recipes and ingredients
- **THEN** they SHALL be displayed in a single unified list (not separate sections)
- **AND** each result SHALL show its type (Rezept or Zutat) visually
- **AND** the list SHALL be sorted by usage_count (descending) or by search relevance when `q` is active

#### Scenario: Ingredient display parity with recipes
- **WHEN** an ingredient is shown in search results
- **THEN** it SHALL display: badge (mapped from status: verified/user_content/draft), icon (Apple), name, "Zutat" label, nutritional tags (up to 3), price per kg (€/kg), and usage count

#### Scenario: Recently used hidden during search
- **WHEN** the search field has 2 or more characters
- **THEN** the "Kürzlich verwendet"-section SHALL be hidden
- **AND** when the search field is cleared (fewer than 2 characters), the section SHALL reappear

#### Scenario: Ingredient click opens quantity dialog
- **WHEN** the user clicks an ingredient result
- **THEN** the IngredientQuantityDialog SHALL open (unchanged behavior)

#### Scenario: Recipe click opens preview dialog
- **WHEN** the user clicks a recipe result
- **THEN** the RecipePreviewDialog SHALL open (unchanged behavior)
