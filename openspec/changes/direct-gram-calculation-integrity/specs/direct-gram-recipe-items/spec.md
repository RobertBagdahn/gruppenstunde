# direct-gram-recipe-items Specification (Delta)

## ADDED Requirements

### Requirement: Direct-gram recipe items have explicit ingredient identity for ingredient calculations

A `RecipeItem` with no portion SHALL interpret `quantity` as grams. It MAY reference an `Ingredient` directly. Ingredient-specific calculations SHALL use that explicit relation; they MUST NOT infer an ingredient from the free-text note. A portion-based RecipeItem SHALL continue to resolve its ingredient through its portion, and any supplied ingredient ID MUST match the portion's ingredient.

#### Scenario: Linked direct-gram item contributes to recipe nutrition

- **GIVEN** a portionless RecipeItem with an explicit ingredient and `quantity=80`
- **AND** the ingredient has nutrition values per 100 g
- **WHEN** recipe nutrition and weight are calculated
- **THEN** the item SHALL contribute 80 g and the ingredient's nutrition scaled by `80 / 100`

#### Scenario: Unlinked direct-gram item keeps its weight without guessed nutrition

- **GIVEN** a portionless RecipeItem with `quantity=80` and no explicit ingredient
- **AND** the note contains a possible ingredient name
- **WHEN** recipe calculations run
- **THEN** the item SHALL contribute 80 g to recipe weight
- **THEN** the system MUST NOT infer nutrients, price, shopping identity, or ingredient-specific tags from the note

#### Scenario: Portion and ingredient references agree

- **GIVEN** a RecipeItem request supplies both `portion_id` and `ingredient_id`
- **WHEN** the portion belongs to a different ingredient than the supplied ingredient ID
- **THEN** the request SHALL be rejected with a client error and MUST NOT persist the item

### Requirement: Direct-gram items are included in meal-plan ingredient calculations

A linked portionless RecipeItem selected by the canonical active-item resolver SHALL contribute its direct gram quantity, adjusted by item factor and recipe serving scale, to meal-plan nutrition, cost, shopping aggregation, and source attribution. Unlinked portionless items SHALL not be assigned to an ingredient.

#### Scenario: Shopping-list aggregation scales linked direct grams

- **GIVEN** a recipe contains a linked direct-gram item of 125 g and is planned for two servings
- **WHEN** the meal-plan shopping list is generated
- **THEN** the linked ingredient SHALL be included with 250 g, its estimated price, and a recipe source contribution of 250 g

#### Scenario: Active variants preserve direct-gram semantics

- **GIVEN** a linked direct-gram item is active in a recipe meal item
- **WHEN** nutrition, cost, shopping, or cooking-plan calculations resolve active recipe items
- **THEN** its ingredient and gram weight SHALL be preserved through the active-item result

### Requirement: Direct-gram recipe item APIs expose the linked ingredient

Recipe item create, update, read, and recipe create/update payloads SHALL accept or expose an optional `ingredient_id` for portionless items. Clearing or changing the portion SHALL not silently guess an ingredient from `note`. Pydantic and Food-Frontend Zod/API contracts MUST remain synchronized.

#### Scenario: Authenticated recipe owner creates a linked direct-gram item

- **GIVEN** an authenticated user who can edit the recipe
- **WHEN** the user creates a RecipeItem with `portion_id=null`, a valid `ingredient_id`, and a positive gram quantity
- **THEN** the saved and returned item SHALL preserve the ingredient ID and expose the ingredient name

#### Scenario: Invalid or unavailable direct ingredient is rejected

- **GIVEN** an authenticated user submits an unknown or deleted ingredient ID for a portionless RecipeItem
- **WHEN** the item is created or updated
- **THEN** the API SHALL reject the request without saving the item

#### Scenario: Unauthenticated mutation is rejected

- **GIVEN** a non-authenticated user
- **WHEN** the user attempts to create or update a RecipeItem
- **THEN** the API SHALL reject the mutation according to the existing authentication contract

### Requirement: Direct-gram items appear in exports

Recipe and meal-plan exports SHALL preserve direct-gram scaling and display the linked ingredient's name when available. Existing unlinked direct-gram items SHALL remain visible by amount and MUST NOT be silently reinterpreted as portion-based quantities.

#### Scenario: Recipe PDF displays a linked direct-gram ingredient

- **GIVEN** a recipe PDF target-serving scale of four and a linked 200 g direct-gram item
- **WHEN** the recipe PDF is rendered
- **THEN** it SHALL display 800 g and the linked ingredient name

#### Scenario: Cooking-plan exports display linked direct grams

- **GIVEN** a meal plan with an active linked direct-gram recipe item
- **WHEN** a cooking schedule or meal-plan PDF is rendered
- **THEN** the scaled gram amount and linked ingredient name SHALL appear in its ingredients
