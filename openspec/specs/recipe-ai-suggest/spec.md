## ADDED Requirements

### Requirement: AI-powered recipe metadata suggestion endpoint
The system SHALL provide a POST endpoint at `/api/recipes/{id}/ai-suggest-all/` that returns suggested values for missing recipe metadata (description, difficulty, duration, servings, recipe_type, scout_levels, tags) using Gemini with Google Search Grounding.

#### Scenario: Successful suggestion for recipe with missing metadata
- **WHEN** an authenticated user who can edit the recipe sends POST to `/api/recipes/{id}/ai-suggest-all/`
- **THEN** the system SHALL return a JSON object with suggested metadata fields, where fields the LLM cannot determine are null

#### Scenario: Unauthenticated user
- **WHEN** an unauthenticated user sends POST to `/api/recipes/{id}/ai-suggest-all/`
- **THEN** the system SHALL return HTTP 403

#### Scenario: User without edit permission
- **WHEN** a user without edit permission sends POST to `/api/recipes/{id}/ai-suggest-all/`
- **THEN** the system SHALL return HTTP 403

#### Scenario: Recipe not found
- **WHEN** a user sends POST with a non-existent recipe ID
- **THEN** the system SHALL return HTTP 404

---

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

---

### Requirement: Zauberstab button on recipe detail page
The system SHALL display a magic wand button on the recipe detail/edit view that triggers AI suggestions for missing metadata.

#### Scenario: User clicks Zauberstab button on recipe
- **WHEN** an authenticated user with edit permission clicks the Zauberstab button on a recipe
- **THEN** the system SHALL open a dialog showing suggested metadata fields with checkboxes for individual acceptance

#### Scenario: Button visibility
- **WHEN** a user without edit permission views the recipe
- **THEN** the Zauberstab button SHALL NOT be displayed

---

### Requirement: AI-powered recipe creation from Create flow
The system SHALL provide a Zauberstab button in the recipe creation flow that creates a complete recipe from a free-text prompt.

#### Scenario: User creates recipe via Zauberstab
- **WHEN** an authenticated user enters a prompt and clicks the Zauberstab in the create flow
- **THEN** the system SHALL call the ai-create endpoint and redirect to the newly created recipe's detail page
