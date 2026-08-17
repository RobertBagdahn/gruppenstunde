## ADDED Requirements

### Requirement: Inline ingredient creation
When a user types an unknown ingredient name in the InlineIngredientEditor, the system SHALL support creating a new ingredient and default portion inline, then inserting it into the editor.

#### Scenario: Create new ingredient from UnknownIngredientDialog
- **WHEN** user types an unknown ingredient name, presses Enter, and clicks "Neu anlegen" in the UnknownIngredientDialog
- **THEN** the system SHALL call POST /api/ingredients/ to create a draft ingredient with the given name
- **THEN** the system SHALL create a default "Gramm" portion for the new ingredient
- **THEN** the new ingredient SHALL be inserted into the edit items list with its default portion selected

#### Scenario: Create fails gracefully
- **WHEN** ingredient creation fails (e.g., network error)
- **THEN** the system SHALL display a toast error message in German
- **THEN** the dialog stays open for retry

### Requirement: Unique portion dropdown labels
The portion dropdown in the InlineIngredientEditor SHALL display unique, descriptive labels that distinguish portions with the same measuring unit.

#### Scenario: Portion dropdown shows quantity + unit
- **WHEN** an ingredient has multiple portions (e.g., "Gramm" with weight_g=1 and "Gramm" with weight_g=100)
- **THEN** each option SHALL display as "{quantity} {measuring_unit_name || name}" (e.g., "1 Gramm", "100 Gramm", "1 Stück")

#### Scenario: Single portion shown as static label
- **WHEN** an ingredient has only one portion
- **THEN** the unit SHALL be displayed as a static text label (not a dropdown)

## MODIFIED Requirements

### Requirement: Ghost-Text Autocomplete Component
The frontend SHALL provide an enhanced autocomplete input component with inline ghost-text suggestion preview for ingredient selection. All API calls SHALL use the configured API_BASE_URL.

#### Scenario: Ghost text appears while typing
- **WHEN** a user types at least 2 characters and the top suggestion starts with the typed text
- **THEN** the remaining characters of the top suggestion SHALL appear as greyed-out ghost text inline after the cursor

#### Scenario: Accept ghost text with Tab
- **WHEN** ghost text is visible and the user presses Tab
- **THEN** the input SHALL be completed with the ghost text suggestion

#### Scenario: Dismiss with Escape
- **WHEN** the dropdown is open and the user presses Escape
- **THEN** the dropdown and ghost text SHALL be dismissed

### Requirement: Debounced API Calls
The component SHALL debounce requests to {API_BASE_URL}/api/ingredients/?name= with a 300ms delay.

#### Scenario: Rapid typing does not flood API
- **WHEN** a user types multiple characters within 300ms
- **THEN** only one API request SHALL be sent after 300ms of inactivity

### Requirement: Dropdown Suggestions
The component SHALL show a dropdown with up to 8 suggestions including category/retail_section as secondary info. All API calls SHALL use the configured API_BASE_URL.

#### Scenario: Dropdown content
- **WHEN** suggestions are returned from the API
- **THEN** the dropdown SHALL display ingredient name as primary text and category or retail_section as secondary text

#### Scenario: Keyboard navigation
- **WHEN** the dropdown is open
- **THEN** the user SHALL be able to navigate with arrow keys, select with Enter, and dismiss with Escape

### Requirement: UnknownIngredientDialog API path
The UnknownIngredientDialog SHALL use API_BASE_URL for its suggest endpoint.

#### Scenario: Suggestion request uses correct base URL
- **WHEN** UnknownIngredientDialog fetches suggestions
- **THEN** the request SHALL use {API_BASE_URL}/api/ingredients/suggest/?q=... instead of hardcoded /api/...
