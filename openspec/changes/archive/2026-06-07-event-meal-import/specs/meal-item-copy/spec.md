## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Item-level selection during copy
**Reason**: Replaced by always-copying-all-items approach. The new dialog always copies all items from the selected meal.
**Migration**: The existing `item_ids` parameter in `CopyItemsFromPlanIn` is removed.

#### Scenario: Copy selected items from another plan
- **WHEN** a user manually selects specific items in the dialog
- **THEN** those items are copied individually
- **Reason**: No longer supported. All items are always copied.

#### Scenario: Dialog steps (item selection step)
- **WHEN** a meal is selected in step 3 of the old dialog
- **THEN** step 4 shows checkboxes for individual items
- **Reason**: Step 4 is removed. Items preview is informational only (no checkboxes).
