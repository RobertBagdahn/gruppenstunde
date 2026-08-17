## Purpose

KI-gestützte Zutatenvorschläge und Auswahl aktiver Normalportionen.

## Requirements

### Requirement: AI suggests ingredients for a recipe
The system SHALL provide an API endpoint that uses Gemini Flash to suggest a complete ingredient list with quantities for a recipe based on its title, description, and recipe type.

#### Scenario: Successful suggestion for recipe with title and description
- **WHEN** authenticated user calls `POST /api/recipes/{recipe_id}/ai-suggest-ingredients/` for a recipe with title "Selbstgemachter Tzatziki-Dip" and recipe_type "dip"
- **THEN** the system returns a list of suggested ingredients with name, matched ingredient_id (if found), portion_id, quantity, and measuring_unit

#### Scenario: Recipe without description
- **WHEN** authenticated user calls the endpoint for a recipe that only has a title (no description)
- **THEN** the system still returns suggestions based on the title alone

#### Scenario: Unauthenticated user
- **WHEN** unauthenticated user calls the endpoint
- **THEN** the system returns HTTP 403

### Requirement: System matches suggested ingredients against existing database
The system SHALL attempt to match AI-suggested ingredient names against existing `Ingredient` records using name, slug, and `IngredientAlias` entries (case-insensitive).

#### Scenario: Exact match found
- **WHEN** AI suggests "Joghurt" and an Ingredient with name "Joghurt" exists
- **THEN** the suggestion includes the existing ingredient_id and its available portions

#### Scenario: Alias match found
- **WHEN** AI suggests "Zitrone" and an IngredientAlias "Zitrone" exists pointing to "Zitronensaft"
- **THEN** the suggestion includes the ingredient_id of "Zitronensaft"

#### Scenario: No match found
- **WHEN** AI suggests "Spezialgewürz" and no matching Ingredient or Alias exists
- **THEN** the system creates a new Ingredient with `status="ai_generated"`, sets name and slug, and returns its id

### Requirement: System selects appropriate portion for each ingredient
The system SHALL select the active `rank=1` portion for each ingredient, falling back to the next active portion with valid weight when necessary.

#### Scenario: Normal portion exists
- **WHEN** matched ingredient has an active `rank=1` Portion with valid weight
- **THEN** that portion is used and quantity is calculated as `ai_estimated_grams / portion.weight_g`

#### Scenario: Normal portion has no weight
- **WHEN** the active `rank=1` portion has no valid weight but another active portion does
- **THEN** the next active portion with valid weight is used

#### Scenario: No portions exist for ingredient
- **WHEN** matched ingredient has no Portion records
- **THEN** the system creates a "Gramm" portion with `weight_g=1.0` and uses quantity directly in grams

### Requirement: User can apply AI suggestions to recipe
The system SHALL provide an endpoint to persist suggested ingredients as RecipeItems.

#### Scenario: Apply all suggestions
- **WHEN** authenticated user calls `POST /api/recipes/{recipe_id}/ai-apply-ingredients/` with the suggestion list
- **THEN** RecipeItems are created for each suggestion with correct ingredient, portion, quantity, and sort_order
- **THEN** the recipe nutritional cache is recalculated

#### Scenario: Recipe already has items
- **WHEN** user applies suggestions to a recipe that already has RecipeItems
- **THEN** existing items are preserved and new items are appended with sort_order continuing from the last existing item

### Requirement: Gemini call uses structured output schema
The system SHALL use single Gemini Flash calls with Pydantic response_schema for structured output (no free-text parsing).

#### Scenario: Structured output format
- **WHEN** the service calls Gemini for ingredient suggestions
- **THEN** it uses `response_mime_type="application/json"` and a Pydantic BaseModel as `response_schema`
- **THEN** the response is validated via `model_validate_json()`

#### Scenario: Gemini call fails
- **WHEN** the Gemini API call fails or returns invalid JSON
- **THEN** the endpoint returns HTTP 503 with error message "KI-Vorschläge konnten nicht generiert werden"
