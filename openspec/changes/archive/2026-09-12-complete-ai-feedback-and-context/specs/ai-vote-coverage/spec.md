## MODIFIED Requirements

### Requirement: AI interaction ID in all AI response schemas
All AI API endpoints SHALL return an `ai_interaction_id` field in their response, enabling user feedback on every AI-generated result. This includes recipe creation, recipe metadata suggestion, recipe ingredient suggestion, step generation/improvement, meal plan suggestions, and ingredient creation.

#### Scenario: Recipe AI endpoints return interaction ID
- **WHEN** `POST /api/recipes/ai-create/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`
- **WHEN** `POST /api/recipes/{slug}/ai-suggest-all/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`
- **WHEN** `POST /api/recipes/{slug}/ai-suggest-ingredients/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`
- **WHEN** `POST /api/recipes/{slug}/steps/generate-from-items/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`
- **WHEN** `POST /api/recipes/{slug}/steps/{id}/suggest-ingredients/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`
- **WHEN** `POST /api/recipes/{slug}/steps/{id}/improve-text/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`

#### Scenario: Ingredient create returns interaction ID
- **WHEN** `POST /api/ingredients/ai-create/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`

#### Scenario: Meal plan suggestions return interaction ID
- **WHEN** `POST /api/meal-plans/ai/suggest/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`

#### Scenario: Intelligent suggestions return interaction ID
- **WHEN** an intelligent/context recipe suggestion request performs an AI rerank
- **THEN** the response SHALL include `ai_interaction_id`

#### Scenario: Recipe improvement suggestions return interaction ID
- **WHEN** recipe improvement suggestions are generated via AI
- **THEN** the response SHALL include `ai_interaction_id`
