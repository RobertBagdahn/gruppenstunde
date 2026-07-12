## MODIFIED Requirements

### Requirement: AI text improvement for all content types
The AI text improvement service SHALL work with all content types (GroupSession, Blog, Game, Recipe), not just Ideas. The service SHALL accept a content_type parameter to provide type-appropriate improvements.

#### Scenario: AI improves GroupSession description
- **WHEN** POST `/api/ai/improve-text/` with text and content_type='session'
- **THEN** the AI SHALL improve the text with scout-activity-appropriate language

#### Scenario: AI improves Blog description
- **WHEN** POST `/api/ai/improve-text/` with text and content_type='blog'
- **THEN** the AI SHALL improve the text with article-appropriate formatting and structure

### Requirement: AI tag suggestions for all content types
The AI tag suggestion service SHALL work with all content types.

#### Scenario: AI suggests tags for Game
- **WHEN** POST `/api/ai/suggest-tags/` with content text and content_type='game'
- **THEN** the AI SHALL suggest relevant tags for the game
- **THEN** new tag suggestions SHALL be created as unapproved TagSuggestions

### Requirement: AI refurbish for all content types
The AI refurbish service (unstructured text to structured content) SHALL work with all content types. The service SHALL detect or accept the target content_type and parse accordingly.

#### Scenario: AI refurbish to GroupSession
- **WHEN** POST `/api/ai/refurbish/` with raw text and content_type='session'
- **THEN** the AI SHALL parse the text into GroupSession fields (title, summary, description, materials, difficulty, etc.)

#### Scenario: AI refurbish to Recipe
- **WHEN** POST `/api/ai/refurbish/` with raw text and content_type='recipe'
- **THEN** the AI SHALL parse the text into Recipe fields including ingredients and quantities

#### Scenario: AI refurbish to Game
- **WHEN** POST `/api/ai/refurbish/` with raw text and content_type='game'
- **THEN** the AI SHALL parse the text into Game fields including rules, player count, play area

### Requirement: AI image generation for all content types
The AI image generation service SHALL work with all content types.

#### Scenario: Generating image for Game
- **WHEN** POST `/api/ai/generate-image/` with title, description, and content_type='game'
- **THEN** the AI SHALL generate a title image appropriate for the game type
- **THEN** the image SHALL be saved as WebP format

### Requirement: AI supply suggestions
The AI service SHALL suggest Materials and Ingredients based on content description.

#### Scenario: AI suggests materials for GroupSession
- **WHEN** POST `/api/ai/suggest-supplies/` with content text and content_type='session'
- **THEN** the AI SHALL return a list of suggested Materials with quantities per person
- **THEN** suggestions SHALL reference existing Supply entries where possible
- **THEN** new Supply entries SHALL be flagged for creation

#### Scenario: AI suggests ingredients for Recipe
- **WHEN** POST `/api/ai/suggest-supplies/` with content text and content_type='recipe'
- **THEN** the AI SHALL return a list of suggested Ingredients with quantities per NormPerson
- **THEN** the AI SHALL also suggest relevant kitchen Materials

## ADDED Requirements

### Requirement: Batch AI price evaluation for ingredients
The AI service SHALL support batch evaluation of ingredient prices via Gemini. Given a list of ingredient IDs, it SHALL suggest realistic `price_per_kg` values based on the ingredient's name, retail section, nutritional profile, and market context.

#### Scenario: AI evaluates multiple ingredient prices
- **WHEN** `POST /api/admin/data-quality/ingredients/price-analysis/evaluate/` with `{ingredient_ids: [1, 2]}` is called by a staff user
- **THEN** the AI SHALL return for each ingredient: a suggested `price_per_kg`, a confidence level, and a brief reasoning in German
- **THEN** each suggestion SHALL reference comparable products and market norms
- **THEN** the response SHALL include a batch token for later apply operations

#### Scenario: AI handles unknown ingredients gracefully
- **WHEN** the AI cannot determine a price for an ingredient (e.g., very obscure item)
- **THEN** it SHALL return `suggested_price: null` and reasoning explaining the uncertainty
- **THEN** the item SHALL still appear in the response with `current_price` and `suggested_price: null`

#### Scenario: Rate limiting respected
- **WHEN** the batch contains more than 50 ingredients
- **THEN** the system SHALL process them in chunks of 50 with delays between chunks
- **THEN** the response SHALL aggregate all results into a single list

#### Scenario: Non-staff cannot access
- **WHEN** a non-staff user calls the batch price evaluation endpoint
- **THEN** a 403 error SHALL be returned

### Requirement: AI response schemas include interaction ID for feedback
Every API endpoint that returns AI-generated content SHALL include an `ai_interaction_id` field in its response schema, enabling users to provide feedback on the AI result.

#### Scenario: Text improvement response includes interaction ID
- **WHEN** `POST /api/content/ai/improve-text/` returns `AiImproveTextOut`
- **THEN** the schema SHALL include `ai_interaction_id: str | None`

#### Scenario: Tag suggestion response includes interaction ID
- **WHEN** `POST /api/content/ai/suggest-tags/` returns `AiSuggestTagsOut`
- **THEN** the schema SHALL include `ai_interaction_id: str | None`

#### Scenario: Refurbish response includes interaction ID
- **WHEN** `POST /api/content/ai/refurbish/` returns `AiRefurbishOut`
- **THEN** the schema SHALL include `ai_interaction_id: str | None`

#### Scenario: Image generation response includes interaction ID
- **WHEN** `POST /api/content/ai/generate-image/` returns `AiGenerateImageOut`
- **THEN** the schema SHALL include `ai_interaction_id: str | None`

#### Scenario: Supply suggestion response includes interaction ID
- **WHEN** `POST /api/content/ai/suggest-supplies/` returns `AiSuggestSuppliesOut`
- **THEN** the schema SHALL include `ai_interaction_id: str | None`

#### Scenario: Recipe and ingredient schemas already compliant
- **WHEN** recipe or ingredient AI endpoints return their responses
- **THEN** `ai_interaction_id` SHALL be present in the response schemas (already implemented, unchanged)

#### Scenario: Event and packing list responses include interaction ID
- **WHEN** event invitation generation or packing list AI suggestion endpoints return their responses
- **THEN** the response SHALL include `ai_interaction_id: str | None`
