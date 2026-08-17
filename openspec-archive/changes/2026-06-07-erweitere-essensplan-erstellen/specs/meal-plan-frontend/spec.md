## MODIFIED Requirements

### Requirement: Meal plan creation page
The system SHALL provide a dialog-based meal plan creation flow on the list page (`/meal-plans/app`). The dialog SHALL NOT be a separate page/route but open as an overlay on the list page. The dialog SHALL support both creating an empty plan and copying an existing plan.

#### Scenario: User creates a new meal plan
- **WHEN** the user clicks "Neuer Essensplan" on the list page
- **THEN** a dialog opens with the fields Name (default "Neuer Essensplan"), Start (default next Friday 18:00), End (default next Sunday 14:00), Portionen (default 10), and optionally a source plan selector

#### Scenario: User creates a copy of an existing plan
- **WHEN** the user checks "Von Plan kopieren" in the dialog and selects a source plan
- **THEN** the system creates a deep copy of the source plan with the specified settings

#### Scenario: User cancels creation
- **WHEN** the user clicks "Abbrechen"
- **THEN** the dialog closes without creating anything

#### Scenario: User triggers "Als Vorlage verwenden" from card menu
- **WHEN** the user clicks "Als Vorlage verwenden" in a plan card's context menu
- **THEN** the create dialog opens with "Von Plan kopieren" pre-checked and the source plan pre-selected

## ADDED Requirements

### Requirement: Default date computation
The system SHALL compute the next weekend dates (Friday–Sunday) using smart logic based on the current day of the week.

#### Scenario: Default start is Friday 18:00
- **WHEN** the dialog opens
- **THEN** the start field is pre-filled to Friday at 18:00 (this Friday if Mon–Wed, next Friday if Thu–Sun)

#### Scenario: Default end is Sunday 14:00
- **WHEN** the dialog opens
- **THEN** the end field is pre-filled to Sunday at 14:00 of the same weekend
