## ADDED Requirements

### Requirement: Ghost-Text Autocomplete Component
The frontend SHALL provide an enhanced autocomplete input component with inline ghost-text suggestion preview for ingredient selection.

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
The component SHALL debounce requests to GET /api/ingredients/?q= with a 300ms delay.

#### Scenario: Rapid typing does not flood API
- **WHEN** a user types multiple characters within 300ms
- **THEN** only one API request SHALL be sent after 300ms of inactivity

### Requirement: Dropdown Suggestions
The component SHALL show a dropdown with up to 8 suggestions including category/retail_section as secondary info.

#### Scenario: Dropdown content
- **WHEN** suggestions are returned from the API
- **THEN** the dropdown SHALL display ingredient name as primary text and category or retail_section as secondary text

#### Scenario: Keyboard navigation
- **WHEN** the dropdown is open
- **THEN** the user SHALL be able to navigate with arrow keys, select with Enter, and dismiss with Escape

#### Scenario: Create new item at dropdown end
- **WHEN** the query has at least 2 characters and the dropdown is open
- **THEN** a "Neue Zutat anlegen" item SHALL appear at the bottom of the dropdown, separated from suggestions by a divider
- **THEN** the item SHALL display the current query text in its label (e.g. `✨ "Brokkolie" neu anlegen`)

---

### Requirement: Create-ingredient navigation
When the user clicks the "Neue Zutat anlegen" item, the system SHALL navigate to the ingredient creation page with pre-fill and redirect parameters.

#### Scenario: Click on create-new item
- **WHEN** the user clicks the "Neue Zutat anlegen" item in the dropdown
- **THEN** the system SHALL navigate to `/ingredients/new?prefillName=<query>&redirectTo=<current page URL>`
- **THEN** the dropdown SHALL close
- **THEN** the `UnknownIngredientDialog` SHALL NOT be shown

#### Scenario: Enter key does not trigger create-new when results exist
- **WHEN** the user presses Enter and the active index is on a regular suggestion
- **THEN** that suggestion SHALL be selected normally (existing behavior unchanged)
