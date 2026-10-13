# recipe-materials Specification

## Purpose
TBD - created by archiving change add-recipe-materials. Update Purpose after archive.
## Requirements
### Requirement: Recipe materials are separate from ingredients and equipment
Recipes SHALL expose a structured material list independent of RecipeItems. Devices and consumables SHALL both be `Material` entries; the separate Equipment relation SHALL not exist. Each link MUST carry a numeric `amount` greater than 0 and a mode `per_portion` or `total`.

#### Scenario: Recipe with toothpicks
- **WHEN** a recipe requires 30 Zahnstocher in `total` mode
- **THEN** the material SHALL appear in the consumables group
- **THEN** it SHALL not appear as a food ingredient

#### Scenario: Recipe with oven
- **WHEN** a recipe requires 1 Backofen
- **THEN** it SHALL appear in the devices group with quantity 1

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

### Requirement: Recipe detail shows materials
The recipe detail page SHALL show, below the ingredients, a section with the groups "Benötigte Geräte" and "Verbrauchsmaterial". `per_portion` quantities MUST scale with the selected servings; `total` quantities MUST stay fixed. Empty groups MUST be hidden; with no materials the section MUST be hidden.

#### Scenario: Scaling
- **GIVEN** "1 Pappteller pro Portion"
- **WHEN** the user selects 12 servings
- **THEN** the page shows 12 Pappteller

#### Scenario: No materials
- **WHEN** a recipe has no materials
- **THEN** the section is not rendered

### Requirement: Consumable costs in recipe cost
Recipe and plan costs SHALL include the cost of consumables with a package price, as price per piece times scaled quantity, in the single total. Per-portion consumables are part of the per-person price, fixed-amount consumables are added to plan totals. Materials without a price and devices MUST NOT add cost.

#### Scenario: Costed consumable
- **GIVEN** Pappteller at 0,06 € per piece and 1 per portion
- **WHEN** the cost for 10 servings is computed
- **THEN** 0,60 € is added to the total

### Requirement: AI suggestions classify and estimate
The AI material suggestion MUST return per suggestion `is_consumable`, an `amount` and the mode; applying remains confirmation-only and atomic.

#### Scenario: Skewer recipe
- **WHEN** AI analyses a skewer recipe
- **THEN** it suggests Schaschlikspieße as consumable with an amount per portion and no link is created before confirmation

### Requirement: Material schema synchronization (extended)
Pydantic responses and Zod schemas SHALL expose `amount` (number), `quantity_mode`, `is_consumable` and the price fields identically.

#### Scenario: Contract parsing
- **WHEN** the API returns a recipe material list
- **THEN** the Food frontend parses each item with `id`, `material_id`, `material_name`, `is_consumable`, `amount`, `quantity_mode` and `sort_order`
