## ADDED Requirements

### Requirement: AI interaction ID in all AI response schemas
All AI API endpoints SHALL return an `ai_interaction_id` field in their response, enabling user feedback (thumbs up/down) on every AI-generated result.

#### Scenario: Content AI endpoints return interaction ID
- **WHEN** `POST /api/content/ai/improve-text/` succeeds
- **THEN** the response SHALL include `ai_interaction_id: "<uuid>"` or `null`
- **WHEN** `POST /api/content/ai/suggest-tags/` succeeds
- **THEN** the response SHALL include `ai_interaction_id: "<uuid>"` or `null`
- **WHEN** `POST /api/content/ai/refurbish/` succeeds
- **THEN** the response SHALL include `ai_interaction_id: "<uuid>"` or `null`
- **WHEN** `POST /api/content/ai/generate-image/` succeeds
- **THEN** the response SHALL include `ai_interaction_id: "<uuid>"` or `null`
- **WHEN** `POST /api/content/ai/suggest-supplies/` succeeds
- **THEN** the response SHALL include `ai_interaction_id: "<uuid>"` or `null`

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

#### Scenario: Event invitation returns interaction ID
- **WHEN** `POST /api/events/generate-invitation/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`

#### Scenario: Packing list suggestions return interaction ID
- **WHEN** `POST /api/packing-lists/{id}/suggestions/ai/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`

#### Scenario: Meal plan suggestions return interaction ID
- **WHEN** `POST /api/meal-plans/ai/suggest/` succeeds
- **THEN** the response SHALL include `ai_interaction_id`

#### Scenario: Ingredient AI endpoints already return interaction ID
- **WHEN** `POST /api/ingredients/ai-create/` succeeds
- **THEN** the response SHALL include `ai_interaction_id` (already present, unchanged)
- **WHEN** `POST /api/ingredients/{slug}/ai-suggest-all/` succeeds
- **THEN** the response SHALL include `ai_interaction_id` (already present, unchanged)

#### Scenario: AI call fails — interaction ID if available
- **WHEN** an AI endpoint returns a non-200 response (429, 503, 502, 500)
- **THEN** `ai_interaction_id` SHALL be included in the error JSON body
- **THEN** the value SHALL be the UUID of the AiInteraction record if one was created, otherwise `null`

### Requirement: Multi-call endpoints return single interaction ID
Endpoints that make multiple internal Gemini calls SHALL return exactly one `ai_interaction_id` from the most significant call.

#### Scenario: Refurbish with ingredient suggestions
- **WHEN** `POST /api/content/ai/refurbish/` makes a refurbish call and optionally an ingredient suggestion call
- **THEN** `ai_interaction_id` SHALL reference the refurbish call (primary)

#### Scenario: Recipe AI suggest-all
- **WHEN** `POST /api/recipes/{slug}/ai-suggest-all/` makes multiple internal calls for different suggestion types
- **THEN** `ai_interaction_id` SHALL reference the primary metadata suggestion call

### Requirement: Service functions propagate interaction ID
All domain service functions that call `gemini_call()` SHALL return the `interaction_id` to their API-layer caller unless the interaction ID is already discarded by convention.

#### Scenario: Content AI service propagates ID
- **WHEN** `ContentAIService.improve_text()` calls `gemini_call()`
- **THEN** the function SHALL return the `interaction_id` alongside its result

#### Scenario: Recipe AI service propagates ID
- **WHEN** `recipe_ai_suggest_service.suggest_all()` calls `gemini_call()`
- **THEN** the function SHALL return the `interaction_id` for the primary call

#### Scenario: Event invitation service propagates ID
- **WHEN** the event `generate_invitation` endpoint calls `gemini_call()`
- **THEN** the handler SHALL include `ai_interaction_id` in the response dict

### Requirement: Vote buttons on all AI result components
The frontend SHALL display `AiVoteButtons` next to every AI-generated result where an `ai_interaction_id` is available.

#### Scenario: Vote buttons after text improvement
- **WHEN** the user receives an improved text from `ai/improve-text/`
- **THEN** `AiVoteButtons` SHALL be displayed next to the result with the returned `ai_interaction_id`

#### Scenario: Vote buttons after refurbish
- **WHEN** the user receives structured content from `ai/refurbish/`
- **THEN** `AiVoteButtons` SHALL be displayed in the result view

#### Scenario: Vote buttons after image generation
- **WHEN** the user receives generated images from `ai/generate-image/`
- **THEN** `AiVoteButtons` SHALL be displayed alongside the image thumbnails

#### Scenario: Vote buttons after event invitation
- **WHEN** the user receives an AI-generated invitation text
- **THEN** `AiVoteButtons` SHALL be displayed below the text

#### Scenario: Vote buttons after packing list suggestions
- **WHEN** the user receives AI packing list suggestions
- **THEN** `AiVoteButtons` SHALL be displayed in the suggestions view

#### Scenario: Vote buttons in recipe creation
- **WHEN** the user creates a recipe via AI (`ai-create/`)
- **THEN** `AiVoteButtons` SHALL be displayed on the result page

#### Scenario: No interaction ID means no vote buttons
- **WHEN** `ai_interaction_id` is `null` or missing in the response
- **THEN** `AiVoteButtons` SHALL NOT be displayed

### Requirement: Schema synchronization for interaction ID
All Zod schemas in the frontend matching AI response schemas SHALL include `ai_interaction_id`.

#### Scenario: Main frontend Zod schemas include interaction ID
- **WHEN** the frontend deserializes any AI response
- **THEN** the Zod schema SHALL accept `ai_interaction_id: z.string().uuid().nullable().optional()`

#### Scenario: Food frontend Zod schemas include interaction ID
- **WHEN** `frontend-food/` deserializes ingredient or recipe AI responses
- **THEN** the Zod schema SHALL accept `ai_interaction_id: z.string().uuid().nullable().optional()`
