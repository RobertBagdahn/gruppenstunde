## MODIFIED Requirements

### Requirement: Dropdown Suggestions
The component SHALL show a dropdown with up to 8 suggestions including category/retail_section as secondary info. At the end of the dropdown, when the query has at least 2 characters, a "Neue Zutat anlegen" item SHALL be displayed.

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

## ADDED Requirements

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
