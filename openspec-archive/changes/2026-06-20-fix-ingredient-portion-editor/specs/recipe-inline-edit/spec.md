## ADDED Requirements

### Requirement: Visual add-ingredient input container
The add-ingredient field in `InlineIngredientEditor` and `CreateRecipePage` SHALL be rendered as a visible card-style input container with a plus-icon and a German label "Zutat hinzufügen", so that users recognize it as an actionable input element.

#### Scenario: Add field visible on recipe detail page
- **WHEN** the InlineIngredientEditor is open
- **THEN** the add-ingredient field SHALL be wrapped in a container with `border-border`, `bg-card`, `rounded-xl` styling matching the food-design-system
- **THEN** a Lucide `Plus` icon SHALL be visible at the start of the container
- **THEN** the German label "Zutat hinzufügen" SHALL be visible above or beside the input

#### Scenario: Add field visible on recipe create page
- **WHEN** the CreateRecipePage ingredient step is shown
- **THEN** the same card-container pattern with plus-icon and label SHALL be used

### Requirement: Duplicate prevention on ingredient add
When a user attempts to add an ingredient that already exists in the editor state (matched by `ingredient_id`), the system SHALL NOT create a new item. Instead, the system SHALL either restore the existing item (if deleted) or show an info toast (if active).

#### Scenario: Re-add a deleted ingredient restores it
- **WHEN** user adds an ingredient whose `ingredient_id` matches an existing `EditableItem` with `isDeleted: true`
- **THEN** the existing item SHALL be restored: `isDeleted: false`, `isDirty: true`
- **THEN** a toast SHALL be shown with German text "Zutat bereits vorhanden – wiederhergestellt"
- **THEN** no new `EditableItem` SHALL be created

#### Scenario: Re-add an active ingredient shows info toast
- **WHEN** user adds an ingredient whose `ingredient_id` matches an existing active `EditableItem` (`isDeleted: false`)
- **THEN** no item SHALL be created or modified
- **THEN** a toast SHALL be shown with German text "Zutat bereits vorhanden"

#### Scenario: New ingredient creates new item
- **WHEN** user adds an ingredient whose `ingredient_id` does not match any existing `EditableItem`
- **THEN** a new `EditableItem` SHALL be created with `isNew: true, isDirty: true`, following the existing smart-default-portion logic

### Requirement: Duplicate prevention in CreateRecipePage
The `CreateRecipePage` SHALL prevent adding an ingredient whose `ingredient_id` is already in the `ingredients` state.

#### Scenario: Re-add existing ingredient on create page
- **WHEN** user selects an ingredient via autocomplete whose `ingredient_id` is already in `ingredients`
- **THEN** no new entry SHALL be added to `ingredients`
- **THEN** a toast SHALL be shown with German text "Zutat bereits vorhanden"

## MODIFIED Requirements

### Requirement: Inline ingredient creation
When a user types an unknown ingredient name in the InlineIngredientEditor, the system SHALL support creating a new ingredient and default portion inline, then inserting it into the editor. If an ingredient with the same name (case-insensitive) was previously deleted from the editor, the system SHALL restore the deleted item instead of creating a new ingredient via the API.

#### Scenario: Create new ingredient from UnknownIngredientDialog
- **WHEN** user types an unknown ingredient name, presses Enter, and clicks "Neu anlegen" in the UnknownIngredientDialog
- **THEN** the system SHALL call POST /api/ingredients/ to create a draft ingredient with the given name
- **THEN** the system SHALL create a default "Gramm" portion for the new ingredient
- **THEN** the new ingredient SHALL be inserted into the edit items list with its default portion selected

#### Scenario: Create fails gracefully
- **WHEN** ingredient creation fails (e.g., network error)
- **THEN** the system SHALL display a toast error message in German
- **THEN** the dialog stays open for retry
