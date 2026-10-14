## MODIFIED Requirements

### Requirement: Duplicate meal plan via API

The system SHALL provide an endpoint `POST /api/meal-plans/{slug}/duplicate/` that creates a copy of an existing meal plan with new parameters.

#### Scenario: Successful duplication

- **WHEN** an authenticated user sends POST `/api/meal-plans/{slug}/duplicate/` with a new name, start/end datetimes, and norm portion count
- **THEN** the system creates a new MealPlan with those values and preserves the source plan's remaining settings
- **AND** source meals are copied to the matching target day with the exact time-of-day preserved
- **AND** each meal preserves `buffet_template`, `buffet_role_amounts`, and `breakfast_profile`, but has an empty note
- **AND** every MealItem preserves `recipe`, `ingredient`, `quantity`, `measuring_unit`, `portion`, `factor`, `display_name`, `active_recipe_item_ids`, `variant_group_id`, `buffet_role`, `buffet_share_percent`, and `is_breakfast_assistant`
- **AND** per-person ingredient quantities SHALL NOT be rescaled just because the target plan has a different `norm_portions`
- **AND** the response contains the new MealPlan in `MealPlanOut` format

#### Scenario: Source plan not found

- **WHEN** an authenticated user sends POST `/api/meal-plans/{slug}/duplicate/` with a non-existing slug
- **THEN** the system returns HTTP 404

#### Scenario: Unauthenticated request

- **WHEN** an unauthenticated user calls the duplicate endpoint
- **THEN** the system returns HTTP 401

#### Scenario: Missing required fields

- **WHEN** an authenticated user sends POST without the required name, start/end datetime, or norm portion count
- **THEN** the system returns HTTP 422 with validation errors

## ADDED Requirements

### Requirement: Copy meal items from another plan without losing portion quantities

When copying items from a source meal into a target meal, the system SHALL preserve `quantity`, `measuring_unit`, `portion`, `factor`, `display_name`, `active_recipe_item_ids`, `variant_group_id`, `buffet_role`, `buffet_share_percent`, and `is_breakfast_assistant`. The quantities SHALL keep their per-person meaning and SHALL NOT be silently converted using the target plan's norm portion count.

#### Scenario: Copy a portion-based ingredient between plans with different norm portions

- **GIVEN** the source meal contains a 1.5 × selected portion ingredient with a confirmed portion weight
- **AND** the source and target plans use different norm portion counts
- **WHEN** the editor copies the source meal items to the target meal
- **THEN** the copied item SHALL retain the same portion ID, quantity, unit, and factor
- **AND** its weight per person SHALL remain unchanged

#### Scenario: Copy Buffet and breakfast metadata

- **GIVEN** a source MealItem has Buffet role/share or breakfast-assistant provenance
- **WHEN** the item is copied to another meal
- **THEN** the copied item SHALL retain those fields so its grouping and wizard ownership remain consistent
