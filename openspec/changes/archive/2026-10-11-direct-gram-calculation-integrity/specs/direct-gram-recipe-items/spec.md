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

### Requirement: Recipe forks preserve direct-gram identity and preparation steps

Forking a recipe SHALL copy every RecipeItem including its direct `ingredient_id`. The fork SHALL also copy the preparation steps with their step-ingredient links remapped to the forked RecipeItems, and SHALL rewrite numeric `{recipe_item_id}` placeholders in step instructions to the forked item IDs. The original recipe MUST keep its own steps and links unchanged.

#### Scenario: Fork keeps a linked direct-gram item

- **GIVEN** an authenticated user who may fork a recipe containing a portionless item with `ingredient_id` and `quantity=250`
- **WHEN** the user forks the recipe
- **THEN** the forked item SHALL have the same `ingredient_id`, `portion_id=null` and `quantity=250`

#### Scenario: Fork copies steps with remapped step ingredients

- **GIVEN** a recipe with two steps whose step ingredients reference a direct-gram item and a portion item
- **WHEN** the recipe is forked
- **THEN** the fork SHALL contain both steps with the same order, duration and section
- **AND** each step ingredient SHALL reference the corresponding forked RecipeItem with the same quantity modifier and preparation
- **AND** `{recipe_item_id}` placeholders in the instructions SHALL point to the forked items

### Requirement: Step ingredients resolve direct-gram identity

Step ingredients in recipe detail responses SHALL expose the ingredient name and ID for both portion-based and direct-gram RecipeItems. A portion-based step ingredient SHALL carry the portion count and portion name; a direct-gram step ingredient SHALL carry grams. Step chips and the recipe PDF step list SHALL use the same amount formatter as the ingredient table.

#### Scenario: Direct-gram step ingredient shows its name

- **GIVEN** a recipe step references a linked direct-gram item of 200 g rice
- **WHEN** an anonymous or authenticated user reads the recipe detail
- **THEN** the step ingredient SHALL include the ingredient name and show „200 g Reis“

#### Scenario: Portion step ingredient shows portion and grams

- **GIVEN** a step references a portion item with 0,35 × „Stück“ (50 g)
- **WHEN** the recipe detail is rendered
- **THEN** the chip SHALL show the portion count with the portion name and the gram weight, not „0,35 g“
