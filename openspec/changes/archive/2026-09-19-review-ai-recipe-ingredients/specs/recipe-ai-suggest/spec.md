## MODIFIED Requirements

### Requirement: AI-powered recipe creation endpoint
The system SHALL provide a POST endpoint at `/api/recipes/ai-create/` that returns a reviewable recipe proposal from a free-text prompt using Gemini with Google Search Grounding. It SHALL NOT create a Recipe, Ingredient, or RecipeItem before the user explicitly confirms all review rows through the recipe workflow.

#### Scenario: Successful recipe proposal
- **WHEN** an authenticated user sends a valid prompt
- **THEN** the endpoint SHALL return metadata and reviewable ingredient proposals
- **THEN** it SHALL not persist recipe or ingredient data

#### Scenario: Unauthenticated user
- **WHEN** an unauthenticated user sends POST to `/api/recipes/ai-create/`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Successful recipe creation
- **WHEN** an authenticated user sends POST to `/api/recipes/ai-create/` with `{ "prompt": "Kaiserschmarrn mit Apfelmus für 4 Personen" }`
- **THEN** the system SHALL create a Recipe with populated metadata, match or create Ingredients, create RecipeItems with quantities, and return the created recipe

#### Scenario: Ingredient matching during creation
- **WHEN** the AI suggests an ingredient name that matches an existing ingredient (by name or alias)
- **THEN** the system SHALL use the existing ingredient rather than creating a duplicate

#### Scenario: Unknown ingredient during creation
- **WHEN** the AI suggests an ingredient that does not exist in the database
- **THEN** the system SHALL create a new ingredient with the suggested name

### Requirement: AI suggestions for existing recipes are preview-only
AI ingredient, quantity, portion, and replacement suggestions for an existing recipe SHALL be returned as review rows and SHALL not mutate recipe items until each affected row is explicitly confirmed or the user invokes the bulk confirmation action.

#### Scenario: Existing recipe suggestion
- **WHEN** an authenticated user with edit permission requests AI ingredient or quantity suggestions
- **THEN** the API SHALL return a preview with original values and proposed values
- **THEN** the existing recipe SHALL remain unchanged

#### Scenario: Confirmed suggestion is applied
- **WHEN** the user explicitly confirms a valid suggestion
- **THEN** the system SHALL apply it through the normal authorized recipe update path
