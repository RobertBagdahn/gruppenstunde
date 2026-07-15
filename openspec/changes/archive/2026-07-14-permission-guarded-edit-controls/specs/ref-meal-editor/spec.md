## ADDED Requirements

### Requirement: API exposes can_edit and can_delete
The RefMeal API response schema SHALL include `can_edit: bool` and `can_delete: bool` fields. Values SHALL be resolved server-side based on the parent MealPlan's edit permissions — a user who can edit the parent MealPlan SHALL also be able to edit its RefMeals.

#### Scenario: RefMeal response includes permission fields
- **WHEN** a client fetches `GET /api/meal-plans/{plan_id}/ref-meals/{id}/`
- **THEN** the response MUST include `can_edit` and `can_delete`
- **THEN** `can_edit` SHALL be `true` when the user can edit the parent MealPlan
- **THEN** `can_delete` SHALL be `true` when the user can delete items from the parent MealPlan

#### Scenario: Non-editor views RefMeal
- **WHEN** a user who cannot edit the parent MealPlan fetches the RefMeal
- **THEN** `can_edit` SHALL be `false`
- **THEN** `can_delete` SHALL be `false`

### Requirement: Editor page respects permissions
The RefMealEditorPage SHALL check `can_edit` before allowing any modifications. All edit controls (save, sync, link all, normalize, remove items, factor changes) SHALL be disabled or hidden when `can_edit` is `false`. Navigating directly to the editor URL without edit permission SHALL show a permission-denied message.

#### Scenario: Editor with permission opens RefMealEditor
- **WHEN** a user with `can_edit: true` navigates to the RefMeal editor
- **THEN** all edit controls (save, sync, remove, factor inputs) SHALL be enabled

#### Scenario: User without permission navigates to RefMealEditor
- **WHEN** a user with `can_edit: false` navigates to the RefMeal editor URL directly
- **THEN** the page SHALL display "Keine Berechtigung" message
- **THEN** all edit controls SHALL be disabled or not rendered
