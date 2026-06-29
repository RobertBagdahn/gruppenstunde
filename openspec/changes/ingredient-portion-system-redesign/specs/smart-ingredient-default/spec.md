## MODIFIED Requirements

### Requirement: Smart default portion on ingredient add

When a user adds an ingredient to a recipe (via CreateRecipePage or InlineIngredientEditor), the system SHALL automatically select the portion with `rank=1` as the default. The selected portion SHALL have `quantity = 1` pre-filled, except when `rank=1` is the system „g" portion (then `quantity = 100`).

#### Scenario: Ingredient has rank=1 portion that is not g

- **WHEN** an ingredient has portions `[{name: "125g", rank: 1, weight_g: 125}, {name: "Stück", rank: 2, weight_g: 180}, {name: "g", rank: 9999, weight_g: 1}]`
- **THEN** the system SHALL select „125g" (rank=1) as the default
- **THEN** the ingredient SHALL be added with `quantity = 1` and `portion_id` pointing to „125g"

#### Scenario: Ingredient only has g portion (rank=1 is g)

- **WHEN** an ingredient has only one portion `[{name: "g", rank: 9999, weight_g: 1}]` or rank=1 is the g-system portion
- **THEN** the system SHALL fall back to the g portion
- **THEN** the ingredient SHALL be added with `quantity = 100`

#### Scenario: rank=1 portion has no weight_g

- **WHEN** the rank=1 portion has `weight_g: null`
- **THEN** the system SHALL skip it and use the next portion with `weight_g > 0` and not a g-base-unit
- **THEN** if no such portion exists, fall back to g with `quantity = 100`

#### Scenario: InlineIngredientEditor uses rank=1 default

- **WHEN** a user adds an ingredient via the InlineIngredientEditor on the recipe detail page
- **THEN** the ingredient SHALL be inserted with the rank=1 portion and `quantity = 1`
- **THEN** the item SHALL be marked as `isDirty: true`

#### Scenario: CreateRecipePage uses rank=1 default

- **WHEN** a user adds an ingredient via the CreateRecipePage
- **THEN** the ingredient SHALL be inserted with the rank=1 portion and `quantity = '1'`

#### Scenario: selectDefaultPortion is simplified

- **WHEN** `selectDefaultPortion(portions)` is called
- **THEN** it SHALL return `portions[0]` (first in sorted array = rank=1)
- **THEN** no priority filtering or is_default checking SHALL occur
