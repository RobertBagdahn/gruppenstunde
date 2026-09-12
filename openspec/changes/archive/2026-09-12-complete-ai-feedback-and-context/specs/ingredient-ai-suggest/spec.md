## MODIFIED Requirements

### Requirement: AI-powered ingredient suggestion returns interaction ID
The `ai-suggest-all` and `ai-create` ingredient endpoints SHALL return an `ai_interaction_id` so users can provide feedback.

#### Scenario: ai-suggest-all returns interaction ID
- **WHEN** an authenticated user sends POST to `/api/ingredients/{slug}/ai-suggest-all/`
- **THEN** the response SHALL include `ai_interaction_id`

#### Scenario: ai-create returns interaction ID
- **WHEN** an authenticated user creates an ingredient via `/api/ingredients/ai-create/`
- **THEN** the response SHALL include `ai_interaction_id`

### Requirement: Ingredient suggestion prompt includes context
Ingredient AI endpoints SHALL include the central context block (dietary tags, group size, season) where relevant to the suggestion.

#### Scenario: Context appended to suggestion prompt
- **WHEN** an ingredient suggestion is generated
- **THEN** the prompt sent to Gemini SHALL include the central context block alongside the ingredient-specific instructions
