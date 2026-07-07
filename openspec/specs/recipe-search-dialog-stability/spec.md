## ADDED Requirements

### Requirement: Stable result list during search transitions

The RecipeSearchDialog SHALL maintain visible search results while a new search query is being fetched. The result list SHALL NOT flash empty or show "Keine Ergebnisse" between query changes.

#### Scenario: User types new search term

- **WHEN** the user types a new search term that triggers a debounced API call
- **THEN** the previously visible results SHALL remain displayed until the new results arrive
- **AND** the result list SHALL NOT display "Keine Ergebnisse" during the loading transition

#### Scenario: Search with previously empty results

- **WHEN** a search returns zero results
- **THEN** the "Keine Ergebnisse" message SHALL be displayed
- **AND** the preceding results SHALL NOT be visible

#### Scenario: Rapid consecutive search queries

- **WHEN** the user types multiple characters in quick succession (before previous API call completes)
- **THEN** the most recent complete results SHALL remain displayed until the final query's response arrives
- **AND** intermediate empty states SHALL NOT be visible

### Requirement: Fixed dialog dimensions

The RecipeSearchDialog SHALL maintain stable width and height while open. Changes to filter state, search query, or sub-dialog visibility SHALL NOT resize the dialog.

#### Scenario: Dialog maintains height with changing content

- **WHEN** the user switches between recipe tabs, toggles filters, or triggers a sub-dialog (preview/quantity)
- **THEN** the outer dialog dimensions SHALL remain unchanged
- **AND** only the content area inside the dialog SHALL scroll

#### Scenario: Sub-dialog opens without hiding main dialog

- **WHEN** the user clicks a recipe (opens preview) or an ingredient (opens quantity selection)
- **THEN** the main dialog SHALL remain fully visible and at the same dimensions
- **AND** the sub-dialog content SHALL replace the search content area within the same dialog container

#### Scenario: Dialog on small screen (320px)

- **WHEN** the dialog is opened on a viewport with 320px width
- **THEN** the dialog SHALL fit within the viewport width
- **AND** the content area SHALL scroll vertically if content overflows

### Requirement: Smooth sub-dialog transitions

IngredientQuantityDialog and RecipePreviewDialog SHALL be rendered as inline overlays within the RecipeSearchDialog content, not as separate Dialog components. The transition between search view and sub-dialog view SHALL be instantaneous (no fade/scale animation).

#### Scenario: User selects an ingredient

- **WHEN** the user clicks an ingredient in the search results
- **THEN** the search content SHALL be replaced by the IngredientQuantity form within the same dialog
- **AND** there SHALL be no visible dialog close/reopen animation

#### Scenario: User selects a recipe

- **WHEN** the user clicks a recipe in the search results
- **THEN** the search content SHALL be replaced by the RecipePreview within the same dialog
- **AND** there SHALL be no visible dialog close/reopen animation

#### Scenario: User cancels sub-dialog

- **WHEN** the user clicks "Abbrechen" in a sub-dialog (preview or quantity)
- **THEN** the search content SHALL be restored within the same dialog
- **AND** there SHALL be no visible dialog close/reopen animation

### Requirement: No conditional unmount of dialog

The RecipeSearchDialog SHALL be rendered unconditionally in all parent views (DayPlanView, TableView, MealSlot). Dialog visibility SHALL be controlled exclusively via the `open` prop.

#### Scenario: Dialog is rendered in DayPlanView

- **WHEN** no search dialog is active (searchDialogMeal is null)
- **THEN** the RecipeSearchDialog SHALL be present in the DOM with `open={false}`
- **AND** the dialog SHALL NOT be unmounted

#### Scenario: Dialog opens in TableView

- **WHEN** the user triggers a recipe search from TableView
- **THEN** the RecipeSearchDialog SHALL open with its enter animation
- **AND** the dialog SHALL NOT mount fresh (it was already in the DOM)
