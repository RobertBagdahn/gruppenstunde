## MODIFIED Requirements

### Requirement: Debounced API Calls
The component SHALL debounce requests to `${API_BASE_URL}/api/ingredients/suggest/?q=` with a 300ms delay.

#### Scenario: Rapid typing does not flood API
- **WHEN** a user types multiple characters within 300ms
- **THEN** only one API request SHALL be sent after 300ms of inactivity

### Requirement: Dropdown Suggestions
The component SHALL show a dropdown with up to 15 suggestions including Nutri-Score badge, price per kg, and usage count as secondary information.

#### Scenario: Dropdown content with enriched info
- **WHEN** suggestions are returned from the API
- **THEN** the dropdown SHALL display:
  - Ingredient name as primary text (font-medium)
  - Nutri-Score badge with class-based coloring (A=green, B=light-green, C=yellow, D=orange, E=red) when `nutri_class` is available
  - Price per kg as "X.XX €/kg" when `price_per_kg` is available
  - Usage count as "N× verwendet" when `usage_count > 0`

#### Scenario: Nutri-Score badge coloring
- **WHEN** a suggestion has `nutri_class` value
- **THEN** class 1 (A) SHALL be displayed with green background
- **THEN** class 2 (B) SHALL be displayed with light-green background
- **THEN** class 3 (C) SHALL be displayed with yellow background
- **THEN** class 4 (D) SHALL be displayed with orange background
- **THEN** class 5 (E) SHALL be displayed with red background

#### Scenario: Keyboard navigation
- **WHEN** the dropdown is open
- **THEN** the user SHALL be able to navigate with arrow keys, select with Enter, and dismiss with Escape

### Requirement: Suggest endpoint as primary search
The IngredientAutocomplete SHALL use the suggest endpoint (`GET /api/ingredients/suggest/?q={query}&limit=15`) as its primary data source instead of the paginated list endpoint.

#### Scenario: Autocomplete uses suggest endpoint
- **WHEN** a user types at least 2 characters in the autocomplete
- **THEN** the component SHALL fetch from `${API_BASE_URL}/api/ingredients/suggest/?q={query}&limit=15`
- **THEN** results SHALL be ordered by similarity (primary) and usage_count (secondary)

## REMOVED Requirements

### Requirement: Ghost-Text Autocomplete Component
**Reason**: Ghost text relied on prefix-matching with alphabetical results. With trigram similarity ranking, the first result may not start with the typed text, making ghost text unreliable and confusing.
**Migration**: Remove ghost text display. The autocomplete dropdown shows ranked suggestions instead.

### Requirement: Dropdown Suggestions (8 results with retail_section)
**Reason**: Replaced by enriched dropdown with 15 results, Nutri-Score, price, and usage count. The previous 8-result limit with only retail_section as secondary info is superseded.
**Migration**: Use the new suggest endpoint with limit=15 and enriched display.