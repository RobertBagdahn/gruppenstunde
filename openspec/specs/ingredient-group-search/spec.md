## ADDED Requirements

### Requirement: IngredientGroup Model

The system SHALL provide an `IngredientGroup` model with fields `name` (unique) and `slug` (unique, auto-generated from name).

- Group names SHALL be human-readable labels like "Nudeln", "Reis", "Kartoffeln".
- The slug SHALL be auto-generated from the name on creation.
- Groups SHALL have an M2M relationship to `Ingredient` via field `groups`.

#### Scenario: Create IngredientGroup
- **WHEN** a staff user creates an `IngredientGroup` with name "Nudeln"
- **THEN** the system creates the group with name "Nudeln" and slug "nudeln"

#### Scenario: Assign group to ingredient
- **WHEN** a user updates an ingredient with `group_ids: [1]` (where group 1 is "Nudeln")
- **THEN** the ingredient SHALL appear in group "Nudeln" and list/detail responses SHALL include the group

### Requirement: IngredientGroups CRUD API

The system SHALL provide CRUD endpoints for `IngredientGroup` under `GET/POST/PATCH/DELETE /api/ingredient-groups/`.

- `GET /api/ingredient-groups/` SHALL return all groups (no auth required for reading).
- `POST /api/ingredient-groups/` SHALL require staff authentication.
- `PATCH /api/ingredient-groups/{id}/` SHALL require staff authentication.
- `DELETE /api/ingredient-groups/{id}/` SHALL require staff authentication.
- Response format SHALL be `{ id: int, name: str, slug: str }`.

#### Scenario: List groups
- **WHEN** a user calls `GET /api/ingredient-groups/`
- **THEN** the response SHALL be a JSON array of all `IngredientGroup` objects

#### Scenario: Create group (non-staff)
- **WHEN** a non-staff user calls `POST /api/ingredient-groups/`
- **THEN** the system SHALL return 403

### Requirement: Ingredient search via groups

The `GET /api/ingredients/` endpoint SHALL support searching by group name and filtering by group slug.

- **Text search**: When `?name=` is provided, the system SHALL also match against `groups__name__icontains` in addition to `name` and `aliases__name`.
- **Group filter**: When `?group=<slug>` is provided, the system SHALL filter to only ingredients in that group.
- Results SHALL include `groups: [{id, name, slug}]` in both list and detail responses.

#### Scenario: Search by group name
- **WHEN** a user calls `GET /api/ingredients/?name=nudeln`
- **THEN** the response SHALL include ingredients whose name, alias, or group name contains "nudeln"

#### Scenario: Filter by group slug
- **WHEN** a user calls `GET /api/ingredients/?group=nudeln`
- **THEN** the response SHALL include only ingredients assigned to the group with slug "nudeln"

### Requirement: Suggest endpoint matches groups

The `GET /api/ingredients/suggest/?q=` endpoint SHALL include group name matches in its results.

#### Scenario: Suggest via group
- **WHEN** a user calls `GET /api/ingredients/suggest/?q=Nudeln`
- **THEN** the response SHALL include ingredients whose group name matches "Nudeln"

### Requirement: Frontend group filter

The `IngredientDetailSearchDialog` SHALL display group filter pills and show group names in ingredient rows.

- Group filter pills SHALL appear between retail section and diet filters.
- Toggling a group pill SHALL filter the ingredient search by that group slug.
- Ingredient rows SHALL display group names next to the retail section name (separated by "·").

#### Scenario: Filter by group in UI
- **WHEN** a user opens the ingredient search dialog and clicks a group filter pill (e.g. "Nudeln")
- **THEN** the search results SHALL only show ingredients in that group

#### Scenario: Group display in rows
- **WHEN** an ingredient belongs to the group "Nudeln"
- **THEN** the ingredient row SHALL show "Nudeln" alongside the retail section name
