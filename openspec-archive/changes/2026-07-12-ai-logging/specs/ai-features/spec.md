## ADDED Requirements

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
- **THEN** the response SHALL include `ai_interaction_id: str | None` (new Pydantic schema required)
