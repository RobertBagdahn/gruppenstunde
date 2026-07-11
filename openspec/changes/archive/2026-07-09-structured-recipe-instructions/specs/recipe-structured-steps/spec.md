## ADDED Requirements

### Requirement: Structured Recipe Steps with Ingredient Linking

Recipes SHALL have structured step-by-step instructions organized as `RecipeStep` records. Each step MUST link to ingredients from the recipe via `RecipeStepIngredient`, enabling deterministic rendering of ingredient quantities and preparation notes within each step.

#### Scenario: Retrieve structured steps for a recipe
- **WHEN** a user fetches a recipe that has structured steps
- **THEN** the API returns a `steps` array containing all `RecipeStep` records with full ingredient assignments

#### Scenario: Placeholder resolution for ingredient mentions
- **WHEN** rendering a step's instruction text containing placeholders like `{Zwiebeln}` or `{uuid-123}`
- **THEN** the system resolves each placeholder to the corresponding ingredient's name, quantity, unit, and preparation notes (e.g., "500g Zwiebeln, gehackt")

#### Scenario: Portion scaling affects all step placeholders
- **WHEN** a user scales the recipe portion (e.g., from 4 servings to 2)
- **THEN** all step instructions automatically show the recalculated ingredient quantities without re-editing

#### Scenario: Backward compatibility for legacy recipes
- **WHEN** fetching a recipe without structured steps but with a `description` field
- **THEN** the system returns `has_structured_steps: false` and falls back to the markdown `description`

### Requirement: Step Duration and Timing

Each step MAY have an optional `duration_minutes` field indicating how long the step typically takes.

#### Scenario: Display step duration in cooking mode
- **WHEN** a user views a recipe in cooking mode
- **THEN** the system displays the step duration prominently (e.g., "⏱ 10 Minuten")

#### Scenario: Calculate total recipe cooking time
- **WHEN** summing durations from all steps
- **THEN** the system displays total preparation time on the recipe detail page

### Requirement: Ingredient Assignment per Step

Each step MUST support multiple ingredient assignments via `RecipeStepIngredient`. Each assignment MAY include:
- `recipe_item_id`: Foreign key to the original recipe ingredient
- `quantity_modifier`: Optional float (e.g., 0.5 for "half of this ingredient for this step only")
- `preparation`: Optional text describing how the ingredient is prepared for this step (e.g., "gehackt", "in Scheiben")

#### Scenario: Display step-specific ingredients
- **WHEN** rendering a step in cooking mode
- **THEN** show only the ingredients used in this step (not the full recipe ingredient list)

#### Scenario: Apply quantity modifiers
- **WHEN** a step has `quantity_modifier = 0.5` for an ingredient
- **THEN** display half the ingredient's base quantity (e.g., "2.5 Zwiebeln" instead of "5 Zwiebeln")

#### Scenario: Assign preparation notes per step
- **WHEN** an ingredient in a step has a preparation field like "gehackt"
- **THEN** display the preparation appended to the ingredient (e.g., "5 Zwiebeln, gehackt")

### Requirement: Placeholder Syntax Support

Step instruction text SHALL support ingredient placeholders in two formats:
- **Name-based**: `{Zwiebeln}` or `@Zwiebeln` (human-readable in editor)
- **ID-based**: `{recipe-item-uuid}` or `@recipe-item-uuid` (database-friendly, prevents breakage from renames)

The system SHALL recognize and resolve both formats to the same ingredient.

#### Scenario: Resolve name-based placeholders
- **WHEN** instruction contains `{Mehl} mit {Wasser} vermengen`
- **THEN** system replaces with "500g Mehl mit 300ml Wasser vermengen"

#### Scenario: Resolve ID-based placeholders
- **WHEN** instruction contains `{item-uuid-1} mit {item-uuid-2} vermengen`
- **THEN** system resolves UUIDs to ingredient names and quantities

#### Scenario: Mix both placeholder formats in single step
- **WHEN** instruction contains `{Mehl} mit {item-uuid-2} vermengen`
- **THEN** system resolves both placeholder types correctly

### Requirement: Step Data Model Validation

- Steps MUST have non-empty `instruction` text
- Each step MUST have at least one `RecipeStepIngredient` reference (or validation fails gracefully)
- All ingredient placeholders in instruction text MUST correspond to actual `RecipeItem` records in the recipe (strict FK validation)
- Steps MUST be ordered by `sort_order` (unique per recipe)

#### Scenario: Validate instruction not empty
- **WHEN** user tries to save a step with empty instruction
- **THEN** system returns validation error "Anleitung darf nicht leer sein"

#### Scenario: Validate ingredient references exist
- **WHEN** step instruction contains placeholder `{UnknownIngredient}` not in recipe
- **THEN** system returns validation error indicating missing ingredient

### Requirement: Batch Update Steps

The API endpoint `PUT /api/recipes/{slug}/steps/batch` SHALL accept a JSON payload with all steps for a recipe and atomically update them.

#### Scenario: Replace all steps with batch update
- **WHEN** user submits `{ steps: [ { instruction: "...", duration_minutes: 10, ... }, ... ] }`
- **THEN** system deletes old steps and inserts new ones in a single transaction

#### Scenario: Preserve sort_order consistency
- **WHEN** steps are updated via batch endpoint
- **THEN** sort_order is auto-assigned based on array position (1, 2, 3, ...)

#### Scenario: Validate all steps before persisting
- **WHEN** batch contains invalid steps (missing instruction, bad FK)
- **THEN** system rejects entire batch with detailed error message

### Requirement: Auto-Generate Description from Steps

When a recipe has structured `steps`, the `description` field SHALL be automatically regenerated as markdown for backward compatibility and SEO.

#### Scenario: Description generated from steps
- **WHEN** saving steps for a recipe with existing `description`
- **THEN** system overwrites `description` with formatted markdown version of steps

#### Scenario: Fallback description for legacy recipes
- **WHEN** recipe has no `steps` but has `description`
- **THEN** API returns `description` as-is (heuristic parsing in frontend)

### Requirement: KI-Gestützte Step-Generierung

The backend MUST provide an AI service (`AiStepService`) capable of generating structured steps from a recipe's ingredients.

#### Scenario: Generate steps from ingredients via API
- **WHEN** user clicks "🤖 Schritt-für-Schritt generieren" in editor
- **THEN** system calls `/api/recipes/{slug}/steps/generate-from-items`, receives AI-generated steps, displays in editor

#### Scenario: AI respects ingredient constraints
- **WHEN** generating steps, the AI SHALL only reference ingredients in the recipe
- **THEN** generated steps have valid FK references to `RecipeItem`

### Requirement: KI-Gestützte Zutat-Zuordnung

The backend MUST provide an AI service capable of suggesting ingredient assignments for a given step based on the instruction text.

#### Scenario: Suggest ingredient assignment
- **WHEN** user clicks "🤖 automatisch" for ingredient assignment in editor
- **THEN** system analyzes step instruction and suggests matching ingredients with preparation notes (e.g., "gehackt")

