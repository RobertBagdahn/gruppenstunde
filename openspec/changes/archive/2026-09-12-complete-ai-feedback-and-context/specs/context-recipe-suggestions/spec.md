## MODIFIED Requirements

### Requirement: Context recipe suggestions return interaction ID
Context-based recipe suggestions (intelligent suggestions with AI rerank) SHALL return an `ai_interaction_id` so users can provide feedback.

#### Scenario: Intelligent suggestions return interaction ID
- **WHEN** a context-recipe-suggestions request performs an AI rerank
- **THEN** the response SHALL include `ai_interaction_id`
