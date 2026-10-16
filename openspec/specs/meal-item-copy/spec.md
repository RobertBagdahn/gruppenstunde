# meal-item-copy Specification

## Purpose
Anforderungen an meal item copy: Copy meal items from another plan to a meal; Copy source selection dialog.

## Requirements
### Requirement: Copy meal items from another plan to a meal
A user SHALL be able to copy all items from any accessible MealPlan into the currently edited meal. The source meal plan SHALL be selectable via a multi-step dialog (plan with search/filter → day → meal with preview). All items SHALL always be copied (no item-level selection). The copy SHALL preserve each source item's recipe/ingredient, quantity, measuring unit, factor and display name. The target meal SHALL have its `note` set to "Importiert aus «{source_plan_name}»". The target meal SHALL belong to the current plan being edited. A target meal that is `is_synced` SHALL NOT be a valid copy destination. The operation SHALL be exposed as a backend endpoint.

#### Scenario: Copy all items from source meal
- **WHEN** a user selects a source plan, a source day, and a source meal in the dialog
- **THEN** all items from the source meal SHALL be copied to the target meal as new MealItems, with identical recipe/ingredient, quantity, unit, factor and display name
- **THEN** the target meal's `note` SHALL be set to "Importiert aus «{source_plan_name}»"

#### Scenario: Synced target rejected
- **WHEN** a user attempts to copy items into a `is_synced=true` meal
- **THEN** the operation SHALL be rejected with an error

#### Scenario: No access to source plan
- **WHEN** a user does not have at least view access to the source plan
- **THEN** the source plan SHALL NOT appear in the source plan list

#### Scenario: Source plan has no meals
- **WHEN** a selected source plan has no days or meals
- **THEN** the dialog SHALL show a "Keine Mahlzeiten vorhanden" message

### Requirement: Copy source selection dialog
The frontend SHALL provide a multi-step dialog (`CopyFromPlanDialog`) to choose a source plan, day and meal. The dialog SHALL offer search/filter on the plan list, show a meal preview before copying, and set a provenance note on the target meal.

#### Scenario: Dialog opens
- **WHEN** a user clicks the "Aus anderem Plan kopieren" button in `MealSlot` or `MealActionsMenu`
- **THEN** the dialog SHALL open showing step 1 (Plan-Liste)

#### Scenario: Step 1 — Plan list with search and date filter
- **WHEN** the dialog opens
- **THEN** step 1 SHALL display a search input, a date range filter (von–bis), and a list of all accessible MealPlans
- **WHEN** the user types in the search input
- **THEN** the plan list SHALL filter to plans whose `name`, `description`, or `event_name` match the query
- **WHEN** the user sets a date range (von/bis)
- **THEN** the plan list SHALL filter to plans whose timeframe overlaps the selected range
- **WHEN** a plan is selected
- **THEN** the dialog SHALL advance to step 2

#### Scenario: Step 1 — Plan card displays
- **WHEN** a plan card is rendered
- **THEN** it SHALL show the plan name, date range (von–bis), number of days, number of meals, and event name (if any)

#### Scenario: Step 2 — Day selection
- **WHEN** a plan was selected in step 1
- **THEN** step 2 SHALL display the days of that plan with formatted dates
- **WHEN** no plan detail data is available
- **THEN** `GET /{plan_id}/` SHALL be fetched
- **WHEN** a day is selected
- **THEN** the dialog SHALL advance to step 3

#### Scenario: Step 3 — Meal selection with preview
- **WHEN** a day was selected in step 2
- **THEN** step 3 SHALL display the available meals for that day, sorted by MEAL_TYPE_ORDER, each showing meal type label + item count + total kcal
- **WHEN** a meal is selected
- **THEN** SHALL show a preview of that meal's items (recipe title, factor, kcal per item) and the total kcal sum
- **WHEN** the user confirms
- **THEN** all items from the source meal SHALL be copied to the target meal

#### Scenario: Provenance note set on copy
- **WHEN** items are copied from a source plan to the target meal
- **THEN** the target meal's `note` SHALL be set to "Importiert aus «{source_plan_name}»"
- **WHEN** the target meal already has a note
- **THEN** the provenance note SHALL be appended (not replaced)

#### Scenario: Back navigation
- **WHEN** a user clicks "Zurück" in step 2 or 3
- **THEN** the dialog SHALL return to the previous step

#### Scenario: Cancel closes dialog
- **WHEN** a user clicks "Abbrechen"
- **THEN** the dialog SHALL close without copying

#### Scenario: Synced target rejected
- **WHEN** a user attempts to copy into a target meal where `is_synced=true`
- **THEN** the operation SHALL be rejected with an error

#### Scenario: No access to source plan
- **WHEN** a user does not have at least view access to a plan
- **THEN** that plan SHALL NOT appear in the source plan list
