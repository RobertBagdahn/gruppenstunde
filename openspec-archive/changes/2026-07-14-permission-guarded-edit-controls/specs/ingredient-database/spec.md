## ADDED Requirements

### Requirement: API exposes can_edit and can_delete
The ingredient API response schemas (`IngredientDetailOut` and `IngredientListItemOut`) SHALL include `can_edit: bool` and `can_delete: bool` fields resolved server-side via `_can_edit_ingredient()` and the existing delete permission logic. The `created_by_id` field SHALL remain in the schema for display purposes.

#### Scenario: Ingredient detail response includes permission fields
- **WHEN** a client fetches `GET /api/ingredients/{slug}/`
- **THEN** the response MUST include `can_edit` (boolean) and `can_delete` (boolean)

#### Scenario: Ingredient list response includes permission fields
- **WHEN** a client fetches `GET /api/ingredients/`
- **THEN** each item in the response MUST include `can_edit` and `can_delete`

## MODIFIED Requirements

### Requirement: Frontend edit visibility
The frontend SHALL only show edit/delete controls when `can_edit` or `can_delete` is `true` in the API response. The frontend SHALL NOT compute edit permissions by comparing `user.id === created_by_id` or checking `user.is_staff` client-side.

#### Scenario: Creator views their ingredient detail
- **WHEN** the ingredient creator views `/ingredients/:slug`
- **THEN** `can_edit` SHALL be `true` in the API response
- **THEN** edit and delete buttons SHALL be visible in the header
- **THEN** PortionCard edit/delete buttons SHALL be visible
- **THEN** Portion drag handles (GripVertical) SHALL be visible
- **THEN** DndContext for portion reordering SHALL be active

#### Scenario: Regular user views another user's ingredient
- **WHEN** a non-staff user who is not the creator views `/ingredients/:slug`
- **THEN** `can_edit` SHALL be `false` in the API response
- **THEN** edit and delete buttons in the header SHALL NOT be visible
- **THEN** PortionCard edit/delete buttons SHALL NOT be visible
- **THEN** Portion drag handles SHALL NOT be visible
- **THEN** DndContext SHALL NOT be active (no drag-and-drop)

#### Scenario: Regular user views ingredient list
- **WHEN** a non-staff user views `/ingredients`
- **THEN** delete buttons on ingredient cards SHALL NOT be visible for ingredients where `can_delete` is `false`
- **THEN** delete buttons on ingredient cards SHALL be visible for ingredients where `can_delete` is `true`
