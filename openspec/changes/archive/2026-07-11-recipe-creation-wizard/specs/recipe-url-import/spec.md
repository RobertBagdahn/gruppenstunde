## MODIFIED Requirements

### Requirement: URL Import Option in Recipe Creation UI
The system SHALL display a third option "Von URL importieren" in the RecipeWizard Step 0 (Methoden-Wahl) alongside "Manuell" and "Mit KI-Hilfe". This replaces the previous location in ContentStepper Step 1.

#### Scenario: User selects URL import
- **WHEN** the user clicks the "Von URL importieren" option in Wizard Step 0
- **THEN** the system SHALL display a URL input field with an "Importieren" button

### Requirement: Preview Before Save
The system SHALL persist the recipe draft immediately after the user confirms the URL import preview. After successful draft creation via `POST /api/recipes/`, the Wizard navigates to Step 1 (Zutaten) where the user can review and edit the imported ingredients using the InlineIngredientEditor. Previously, the import only pre-filled the edit form without persisting.

#### Scenario: User reviews and edits after import
- **WHEN** the user confirms the URL import preview
- **THEN** the system SHALL create a recipe draft via `POST /api/recipes/` with the imported data and `status="draft"`
- **THEN** the Wizard SHALL navigate to Step 1 (Zutaten) with the imported ingredients loaded in the InlineIngredientEditor
- **THEN** the user can modify title, recipe type, ingredients before proceeding
