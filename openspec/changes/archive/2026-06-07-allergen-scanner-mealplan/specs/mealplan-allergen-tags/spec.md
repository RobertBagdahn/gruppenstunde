## ADDED Requirements

### Requirement: MealPlan can have allergen tags assigned
The system SHALL allow assigning zero or more allergen tags (NutritionalTag with is_dangerous=True) to a MealPlan via a Many-to-Many relationship.

#### Scenario: Assign allergen tags on MealPlan creation
- **WHEN** creating a MealPlan via POST /api/meal-plans/ with allergen_tag_ids in payload
- **THEN** the MealPlan is created with the specified allergen tags linked
- **THEN** GET /api/meal-plans/{id}/ returns allergen_tag_ids in response

#### Scenario: Update allergen tags on existing MealPlan
- **WHEN** patching a MealPlan via PATCH /api/meal-plans/{id}/ with allergen_tag_ids
- **THEN** the allergen tags are replaced with the new list
- **THEN** GET /api/meal-plans/{id}/ returns updated allergen_tag_ids

#### Scenario: Only is_dangerous tags can be assigned as allergens
- **WHEN** attempting to assign a NutritionalTag with is_dangerous=False as allergen tag
- **THEN** the API returns 422 validation error "Nur Allergen-Tags (is_dangerous=True) erlaubt"

#### Scenario: Empty allergen tags means no allergen restrictions
- **WHEN** MealPlan has no allergen_tag_ids (empty array or null)
- **THEN** the allergen scanner returns zero violations
- **THEN** recipe search does not filter by allergens

### Requirement: Allergen tags are visible in MealPlan list and detail
The system SHALL include allergen_tag_ids and allergen_tag_names in MealPlan list and detail responses.

#### Scenario: MealPlan list includes allergen tag IDs
- **WHEN** fetching GET /api/meal-plans/
- **THEN** each MealPlan item includes allergen_tag_ids: number[]
- **THEN** each MealPlan item includes allergen_tag_names: string[]

#### Scenario: MealPlan detail includes full allergen tag objects
- **WHEN** fetching GET /api/meal-plans/{id}/
- **THEN** response includes allergen_tags: [{id, name, name_opposite}, ...]

### Requirement: Admin UI for allergen tag assignment
The system SHALL allow admins to manage allergen tags on MealPlan via Django Admin.

#### Scenario: Admin can add/remove allergen tags in MealPlan admin
- **WHEN** editing a MealPlan in Django Admin
- **THEN** allergen_tags field shows only NutritionalTag with is_dangerous=True
- **THEN** tags can be added/removed via filter_horizontal widget