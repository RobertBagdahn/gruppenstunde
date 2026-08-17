## MODIFIED Requirements

### Requirement: AI-powered recipe creation endpoint
The system SHALL provide a POST endpoint at `/api/recipes/ai-create/` that creates a complete recipe (with metadata and ingredient items) from a free-text prompt using Gemini with Google Search Grounding.

#### Scenario: Successful recipe creation
- **WHEN** an authenticated user sends POST to `/api/recipes/ai-create/` with `{ "prompt": "Kaiserschmarrn mit Apfelmus für 4 Personen" }`
- **THEN** the system SHALL create a Recipe with populated metadata, match or create Ingredients, create RecipeItems with quantities, and return the created recipe

#### Scenario: Ingredient matching during creation
- **WHEN** the AI suggests an ingredient name that matches an existing ingredient (by name or alias)
- **THEN** the system SHALL use the existing ingredient rather than creating a duplicate

#### Scenario: Unknown ingredient during creation
- **WHEN** the AI suggests an ingredient that does not exist in the database
- **THEN** the system SHALL create a new ingredient with the suggested name

#### Scenario: Unauthenticated user
- **WHEN** an unauthenticated user sends POST to `/api/recipes/ai-create/`
- **THEN** the system SHALL return HTTP 403

### Requirement: AI-powered recipe creation from Create flow
The system SHALL provide a Zauberstab button in the recipe creation flow that creates a complete recipe from a free-text prompt.

#### Scenario: User creates recipe via Zauberstab
- **WHEN** an authenticated user enters a prompt and clicks the Zauberstab in the create flow
- **THEN** the system SHALL call the ai-create endpoint and redirect to the newly created recipe's detail page
