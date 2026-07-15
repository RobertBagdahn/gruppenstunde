## ADDED Requirements

### Requirement: List schema exposes can_edit and can_delete
The shopping list list item response schema (`ShoppingListOut` in list endpoints) SHALL include `can_edit: bool` and `can_delete: bool` fields resolved server-side based on the user's relationship to the shopping list (owner, collaborator role, staff status).

#### Scenario: Shopping list list includes permission fields
- **WHEN** a client fetches `GET /api/shopping-lists/`
- **THEN** each item in the response MUST include `can_edit` and `can_delete`
- **THEN** `can_edit` SHALL be `true` for lists where the user has editor or admin access
- **THEN** `can_edit` SHALL be `false` for lists where the user only has viewer access or no access
