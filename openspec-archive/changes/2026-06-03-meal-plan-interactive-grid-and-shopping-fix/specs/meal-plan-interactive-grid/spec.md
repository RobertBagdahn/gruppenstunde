## ADDED Requirements

### Requirement: Always-Visible 5-Meal Grid
The system SHALL display all 5 meal types (breakfast, lunch, dinner, snack, dessert) as rows in the table view, regardless of whether a Meal object exists for that slot.

#### Scenario: Full grid layout
- **WHEN** the user opens the table view for a meal plan
- **THEN** the system displays columns for all scheduled dates and rows for breakfast, lunch, dinner, snack, and dessert, with placeholder cells for empty slots.

### Requirement: Placeholder Quick Actions for Empty Slots
The system SHALL render placeholder actions ("+ Rezept", "+ Zutat", "+ Notiz") in empty grid cells, which automatically initialize a new Meal slot for that date/type upon interaction.

#### Scenario: User clicks + Rezept on empty slot
- **WHEN** the user clicks "+ Rezept" on an empty "breakfast" slot for Saturday
- **THEN** the system triggers a POST request to create the "breakfast" meal for that date and opens the recipe search dialog.

#### Scenario: User clicks + Zutat on empty slot
- **WHEN** the user clicks "+ Zutat" on an empty "lunch" slot for Sunday
- **THEN** the system triggers a POST request to create the "lunch" meal for that date and opens the ingredient search/details dialog.

#### Scenario: User clicks + Notiz on empty slot
- **WHEN** the user clicks "+ Notiz" on an empty "dinner" slot for Friday
- **THEN** the system triggers a POST request to create the "dinner" meal for that date and opens an inline text input to edit the note.

### Requirement: Inline Factor and Note Controls
The system SHALL display an inline factor multiplier input ("×" prefix) and editable note/details for each added recipe/ingredient directly inside the table cells.

#### Scenario: User updates item factor in table
- **WHEN** the user edits the factor input of a recipe item in a table cell to "1,5" and loses focus
- **THEN** the system triggers a PATCH request to update the factor and refreshes the table's nutrition/cost display.

#### Scenario: User deletes item from table cell
- **WHEN** the user clicks the "Entfernen" button on a recipe item in a table cell
- **THEN** the system triggers a DELETE request to remove the item and updates the cell content.
