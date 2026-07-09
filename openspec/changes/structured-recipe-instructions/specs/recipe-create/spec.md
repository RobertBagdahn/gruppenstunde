## MODIFIED Requirements

### Requirement: Create Recipe with Structured Steps

The recipe creation interface SHALL support creating recipes with structured steps from the start (not just legacy markdown).

#### Scenario: Create recipe with steps
- **WHEN** user creates a new recipe and selects "Mit Schritten" option
- **THEN** system launches the Step Editor interface for defining steps during creation

#### Scenario: Fallback to markdown creation
- **WHEN** user selects "Mit Beschreibung" option during creation
- **THEN** system displays markdown editor as before (legacy path)

### Requirement: Inline Step Editor in Create Flow

The recipe creation flow SHALL integrate the step editor for new recipes.

#### Scenario: Add steps while creating recipe
- **WHEN** user is in create-recipe flow with steps mode
- **THEN** step editor is displayed inline, allowing user to add/edit steps before saving recipe

