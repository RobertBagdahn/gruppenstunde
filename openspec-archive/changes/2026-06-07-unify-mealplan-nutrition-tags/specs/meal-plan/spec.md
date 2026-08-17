## ADDED Requirements

### Requirement: MealPlan nutritional tags

The MealPlan model SHALL have a `nutritional_tags` M2M field to `supply.NutritionalTag` (no `limit_choices_to` restriction). All NutritionalTag records (both `is_dangerous=True` and `is_dangerous=False`) SHALL be assignable.

The field replaces the former `allergen_tags` field. The `limit_choices_to={"is_dangerous": True}` restriction SHALL be removed.

#### Scenario: Create MealPlan with nutritional tags
- **WHEN** an authenticated user sends POST `/api/meal-plans/` with `nutritional_tag_ids: [1, 2]` (e.g. vegan + vegetarisch)
- **THEN** the MealPlan is created with both tags assigned

#### Scenario: Update MealPlan nutritional tags
- **WHEN** an authenticated user sends PATCH `/api/meal-plans/{id}/` with `nutritional_tag_ids: [3]` (e.g. laktosefrei)
- **THEN** the MealPlan's nutritional tags are updated to only contain tag ID 3

#### Scenario: List MealPlan includes nutritional tag IDs and names
- **WHEN** GET `/api/meal-plans/` is called
- **THEN** each MealPlan in the response SHALL include `nutritional_tag_ids: [...]` and `nutritional_tag_names: [...]`

#### Scenario: MealPlan detail includes nutritional tags with full objects
- **WHEN** GET `/api/meal-plans/{id}/` is called
- **THEN** the response SHALL include `nutritional_tag_ids: [int, ...]` and `nutritional_tags: [NutritionalTagOut, ...]`

### Requirement: Nutritional tag selection in MealPlan create dialog

The MealPlan create dialog SHALL allow selecting nutritional tags during creation, not only after creation via settings.

#### Scenario: Create dialog shows tag picker
- **WHEN** the "Neuer Essensplan" dialog is opened
- **THEN** a `NutritionalTagMultiSelect` component SHALL be visible allowing tag selection

#### Scenario: Tags sent during creation
- **WHEN** the user selects tags in the create dialog and clicks "Erstellen"
- **THEN** `nutritional_tag_ids` SHALL be included in the POST body

### Requirement: Settings panel uses NutritionalTagMultiSelect

The MealPlan settings panel SHALL use the shared `NutritionalTagMultiSelect` component for tag selection instead of a custom button-based UI. All nutritional tags SHALL be selectable (no `is_dangerous` filter).

#### Scenario: Settings panel shows all tags
- **WHEN** the settings panel is opened
- **THEN** all nutritional tags (dangerous and non-dangerous) SHALL be displayed in the tag picker

#### Scenario: Tag changes are saved
- **WHEN** the user modifies tag selection in settings and clicks "Speichern"
- **THEN** the updated `nutritional_tag_ids` SHALL be sent via PATCH

### Requirement: Allergen scan checks all nutritional tags

The allergen scan endpoint SHALL compare ALL `nutritional_tags` of assigned recipes against the plan's `nutritional_tags`. The `is_dangerous` filter on recipe tags SHALL be removed — every matching tag SHALL be reported as a violation.

#### Scenario: Non-dangerous tag match triggers violation
- **WHEN** a MealPlan has `nutritional_tags = [vegan]` and an assigned recipe has `nutritional_tags = [vegan]`
- **THEN** the scan SHALL report a violation for that recipe, even though `vegan` has `is_dangerous=False`

#### Scenario: Scan returns all plan nutritional tags
- **WHEN** GET `/api/meal-plans/{id}/allergen-scan/` is called
- **THEN** the response `allergen_tags` field SHALL contain all `nutritional_tags` of the plan (not only dangerous ones)

## REMOVED Requirements

### Requirement: Allergen tag restriction on MealPlan

**Reason**: The `limit_choices_to={"is_dangerous": True}` restriction on the MealPlan tag field is removed. All nutritional tags SHALL be assignable to MealPlans.

**Migration**: Existing `allergen_tags` M2M field is renamed to `nutritional_tags`. Existing tag assignments are preserved. Run `uv run python manage.py makemigrations planner` and `uv run python manage.py migrate`.
