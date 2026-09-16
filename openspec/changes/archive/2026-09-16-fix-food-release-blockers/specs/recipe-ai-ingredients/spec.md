## MODIFIED Requirements

### Requirement: System matches suggested ingredients against existing database
The system SHALL attempt to match AI-suggested ingredient names against existing `Ingredient` records using name, slug, aliases and explicit generic-to-concrete replacement mappings. A matched replacement for an ingredient already in the recipe SHALL be returned as a replacement candidate rather than an additional ingredient. Replacement candidates SHALL NOT be removed by the later normal duplicate filter.

#### Scenario: Exact match found
- **WHEN** AI suggests "Joghurt" and an Ingredient with name "Joghurt" exists
- **THEN** the suggestion includes the existing ingredient_id and its available portions

#### Scenario: Alias match found
- **WHEN** AI suggests "Zitrone" and an IngredientAlias "Zitrone" exists pointing to "Zitronensaft"
- **THEN** the suggestion includes the ingredient_id of "Zitronensaft"

#### Scenario: Replacement match found
- **WHEN** AI suggests "Jodsalz" and the recipe already contains mapped generic ingredient "Salz"
- **THEN** the suggestion includes the target ingredient and the existing RecipeItem ID to replace
- **THEN** no additional RecipeItem suggestion is returned
- **THEN** the replacement candidate remains in the API response despite the source ingredient already being present

#### Scenario: No match found
- **WHEN** AI suggests "Spezialgewürz" and no matching Ingredient or Alias exists
- **THEN** the preview SHALL return an unresolved candidate without creating a persistent Ingredient

### Requirement: User can apply AI suggestions to recipe
The system SHALL provide endpoints to persist selected new ingredients and to apply selected replacement candidates atomically as RecipeItems.

#### Scenario: Apply all suggestions
- **WHEN** authenticated user calls `POST /api/recipes/{recipe_id}/ai-apply-ingredients/` with the suggestion list
- **THEN** RecipeItems are created for each suggestion with correct ingredient, portion, quantity, and sort_order
- **THEN** the recipe nutritional cache is recalculated

#### Scenario: Recipe already has items
- **WHEN** user applies suggestions to a recipe that already has RecipeItems
- **THEN** existing items are preserved and new items are appended with sort_order continuing from the last existing item

#### Scenario: Apply replacement
- **WHEN** the user confirms a replacement candidate
- **THEN** the target RecipeItem SHALL be replaced through the dedicated replacement operation
- **THEN** the recipe nutritional cache SHALL be recalculated

#### Scenario: Preview is discarded
- **WHEN** the user closes the AI suggestion dialog without applying a candidate
- **THEN** no draft Ingredient or RecipeItem SHALL be created
