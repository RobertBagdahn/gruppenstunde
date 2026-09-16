## ADDED Requirements

### Requirement: Recipe materials are separate from ingredients and equipment
Recipes SHALL expose a structured material list independent of RecipeItems and the Equipment M2M relation.

#### Scenario: Recipe with toothpicks
- **WHEN** a recipe requires `30 Zahnstocher`
- **THEN** the material SHALL appear in the material list
- **THEN** it SHALL not appear as a food ingredient or equipment item

### Requirement: Recipe material CRUD API
The system SHALL provide authenticated, permission-checked list, create, update, delete and reorder endpoints under `/api/recipes/{recipe_id}/materials/`.

#### Scenario: Authorized create
- **WHEN** a recipe editor creates a material link with material ID and quantity `30 Stück`
- **THEN** the API SHALL return the created material item with ID, name, quantity and sort order

#### Scenario: Unauthorized create
- **WHEN** a non-editor or unauthenticated user attempts to add a recipe material
- **THEN** the API SHALL return HTTP 403

#### Scenario: Duplicate material
- **WHEN** the same active material is already linked to the recipe
- **THEN** the API SHALL reject or merge the duplicate deterministically

### Requirement: AI material suggestions require confirmation
The system SHALL provide a recipe material suggestion and apply flow separate from ingredient suggestions.

#### Scenario: Suggested toothpicks
- **WHEN** AI analyzes a tomato-mozzarella skewer recipe
- **THEN** it MAY return `Zahnstocher` as a material with a quantity
- **THEN** no database link SHALL be created before user confirmation

#### Scenario: Apply selected material
- **WHEN** the user confirms a matched material suggestion
- **THEN** the material link SHALL be created atomically
- **THEN** rejected suggestions SHALL not be persisted

### Requirement: Material schema synchronization
Backend Pydantic responses and Food frontend Zod schemas SHALL expose the same recipe material fields.

#### Scenario: Contract parsing
- **WHEN** the API returns a recipe material list
- **THEN** the Food frontend SHALL parse each item with `id`, `material_id`, `material_name`, `quantity` and `sort_order`
