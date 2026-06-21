## Requirements

### Requirement: Smart default portion on ingredient add
When a user adds an ingredient to a recipe (via CreateRecipePage or InlineIngredientEditor), the system SHALL automatically select the first meaningful portion instead of the base "Gramm" portion with `weight_g = 1`. The selected portion SHALL have `quantity = 1` pre-filled.

#### Scenario: Ingredient has multiple portions with varying weights
- **WHEN** an ingredient has portions `[{name: "Gramm", weight_g: 1, priority: 0, rank: 1}, {name: "Esslöffel", weight_g: 15, priority: 5, rank: 2}, {name: "Tasse", weight_g: 120, priority: 3, rank: 3}]`
- **THEN** the system SHALL select "Esslöffel" (highest priority among non-1g portions)
- **THEN** the ingredient SHALL be added with `quantity = 1` and `portion_id` pointing to "Esslöffel"

#### Scenario: Ingredient only has Gramm portion
- **WHEN** an ingredient has only one portion `[{name: "Gramm", weight_g: 1, priority: 0, rank: 1}]`
- **THEN** the system SHALL fall back to the Gramm portion
- **THEN** the ingredient SHALL be added with `quantity = 100`

#### Scenario: Portions sorted by priority then rank
- **WHEN** an ingredient has portions `[{name: "Esslöffel", weight_g: 15, priority: 2, rank: 1}, {name: "Stück", weight_g: 150, priority: 5, rank: 2}]`
- **THEN** the system SHALL select "Stück" (higher priority, 5 > 2)

#### Scenario: Priority tie broken by rank
- **WHEN** portions have equal priority: `[{name: "TL", weight_g: 5, priority: 0, rank: 2}, {name: "EL", weight_g: 15, priority: 0, rank: 1}]`
- **THEN** the system SHALL select "EL" (lower rank, 1 < 2)

#### Scenario: Portion with unknown weight is skipped
- **WHEN** an ingredient has portions `[{name: "Gramm", weight_g: 1, priority: 0, rank: 1}, {name: "Beutel", weight_g: null, priority: 0, rank: 2}]`
- **THEN** the system SHALL skip "Beutel" (weight_g is null)
- **THEN** the system SHALL fall back to Gramm with `quantity = 100`

#### Scenario: InlineIngredientEditor uses smart default (was 0 before)
- **WHEN** a user adds an ingredient via the InlineIngredientEditor on the recipe detail page
- **THEN** the ingredient SHALL be inserted with the smart default portion and `quantity = 1`
- **THEN** the item SHALL be marked as `isDirty: true`

#### Scenario: CreateRecipePage uses smart default (was hardcoded 1 before)
- **WHEN** a user adds an ingredient via the CreateRecipePage
- **THEN** the ingredient SHALL be inserted with the smart default portion and `quantity = '1'`
