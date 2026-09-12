## MODIFIED Requirements

### Requirement: Recipe AI create prompt includes context
The `ai-create` endpoint SHALL enrich the AI prompt with the central context block (dietary/nutritional tags, group size, season) in addition to the user's free-text prompt.

#### Scenario: Context appended to create prompt
- **WHEN** a user submits a free-text prompt to `POST /api/recipes/ai-create/`
- **THEN** the prompt sent to Gemini SHALL include the central context block alongside the free-text prompt
