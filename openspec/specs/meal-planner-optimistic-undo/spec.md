# meal-planner-optimistic-undo Specification

## Purpose
TBD - created by archiving change redesign-meal-planner-ux. Update Purpose after archive.
## Requirements
### Requirement: Optimistic Item Removal with Toast Undo
Removing an individual ingredient or recipe from a meal slot SHALL remove the item immediately from the UI without a blocking confirmation modal and display an undo toast for 6 seconds.

#### Scenario: Removing recipe item with instant feedback
- **WHEN** user clicks the remove icon on a recipe ingredient
- **THEN** item disappears immediately and a toast notification displays "Zutat entfernt" with an active "[ Rückgängig ]" action button

#### Scenario: Undoing an item removal
- **WHEN** user clicks "[ Rückgängig ]" within 6 seconds of removal
- **THEN** item is restored in its exact previous position and portion settings in the UI and pending deletion is aborted

### Requirement: Confirmation Dialog for Destructive Mass Actions
Deleting an entire meal slot or a full day from the plan SHALL require explicit confirmation via a confirmation dialog.

#### Scenario: Deleting a full day
- **WHEN** user selects "Tag löschen" from the day actions menu
- **THEN** system displays a modal confirmation dialog requesting user verification before performing the deletion
