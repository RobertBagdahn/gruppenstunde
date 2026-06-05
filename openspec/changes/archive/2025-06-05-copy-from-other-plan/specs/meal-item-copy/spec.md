## MODIFIED Requirements

### Requirement: Copy meal items from another plan to a meal
A user SHALL be able to copy individual items from any accessible MealPlan into the currently edited meal. The source meal plan SHALL be selectable via a multi-step dialog (plan → day → meal → items). Only items that the user has selected SHALL be copied. The copy SHALL preserve each source item's recipe/ingredient, quantity, measuring unit, factor and display name. The target meal SHALL belong to the current plan being edited. A target meal that is `is_synced` SHALL NOT be a valid copy destination. The operation SHALL be exposed as a backend endpoint.

#### Scenario: Copy selected items from another plan
- **WHEN** a user selects a source plan, a source day, a source meal, and checks specific items to copy
- **THEN** a new MealItem SHALL be created in the target meal for each selected source item, with identical recipe/ingredient, quantity, unit, factor and display name

#### Scenario: Copy all items from source meal
- **WHEN** a user selects a source meal and does not filter individual items
- **THEN** all items from the source meal SHALL be copied to the target meal

#### Scenario: Synced target rejected
- **WHEN** a user attempts to copy items into a `is_synced=true` meal
- **THEN** the operation SHALL be rejected with an error

#### Scenario: Source equals current plan rejected
- **WHEN** a user selects the same plan they are currently editing as the source
- **THEN** the frontend SHALL exclude the current plan from the source plan list

#### Scenario: No access to source plan
- **WHEN** a user does not have at least view access to the source plan
- **THEN** the target plan SHALL NOT appear in the source plan list

#### Scenario: Source plan has no meals
- **WHEN** a selected source plan has no days or meals
- **THEN** the dialog SHALL show a "Keine Mahlzeiten vorhanden" message

## ADDED Requirements

### Requirement: Copy source selection dialog
The frontend SHALL provide a multi-step dialog (`CopyFromPlanDialog`) to choose the source plan, day, meal and items. The dialog SHALL replace the previous `CopyMealItemDialog`.

#### Scenario: Dialog steps
- **WHEN** the dialog opens
- **THEN** step 1 SHALL display all accessible MealPlans (excluding the current plan), each showing name, date range and meal count
- **WHEN** a plan is selected in step 1
- **THEN** step 2 SHALL display the days of that plan with dates
- **WHEN** a day is selected in step 2
- **THEN** step 3 SHALL display the meals of that day with meal type labels
- **WHEN** a meal is selected in step 3
- **THEN** step 4 SHALL display the items of that meal with checkboxes and show the copy button with selected item count

#### Scenario: Back navigation
- **WHEN** a user clicks "Zurück" in step 2, 3 or 4
- **THEN** the dialog SHALL return to the previous step

#### Scenario: Cancel closes dialog
- **WHEN** a user clicks "Abbrechen"
- **THEN** the dialog SHALL close without copying

### Requirement: Entry points for copy action
The copy-from-other-plan action SHALL be accessible from two places in the meal planning UI.

#### Scenario: Copy action in MealActionsMenu
- **WHEN** a user opens the MealActionsMenu for a meal
- **THEN** they SHALL see a "Aus anderem Plan kopieren" menu item
- **WHEN** they click it
- **THEN** the CopyFromPlanDialog SHALL open, targeting that meal

#### Scenario: Copy action on meal item
- **WHEN** a user hovers over a meal item in MealSlot
- **THEN** they SHALL see a "Aus anderem Plan kopieren" button replacing the old copy button
- **WHEN** they click it
- **THEN** the CopyFromPlanDialog SHALL open, targeting the parent meal
