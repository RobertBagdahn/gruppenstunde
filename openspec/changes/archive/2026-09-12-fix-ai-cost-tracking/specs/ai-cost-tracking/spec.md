## MODIFIED Requirements

### Requirement: Cost calculation in EUR
The system SHALL calculate the cost of each Gemini call based on the model's pricing table and store it in EUR. When a model is not listed in `GEMINI_PRICING`, the system SHALL log a warning and SHALL NOT silently discard the pricing information.

#### Scenario: Unknown model logs warning
- **WHEN** a model not listed in `GEMINI_PRICING` is called
- **THEN** the system SHALL log a warning identifying the unknown model
- **THEN** `cost_eur` SHALL remain NULL and `pricing_model` SHALL be set to the model name for audit purposes

### Requirement: Token extraction from Gemini response
The system SHALL extract token usage data from every successful Gemini API response. Output token cost SHALL be based on `candidates_token_count`; `thoughts_token_count` SHALL be stored as a metric but SHALL NOT be added to the output total (it is already included in `candidates_token_count`).

#### Scenario: Thinking tokens are not double-counted
- **WHEN** a response includes both `candidates_token_count` and `thoughts_token_count`
- **THEN** the completion token total used for cost SHALL equal `candidates_token_count`
- **THEN** `thoughts_tokens` SHALL still be stored for reporting

### Requirement: Background calls are flagged
Management commands and batch operations that call Gemini SHALL mark their interactions with `is_background=True` so they do not inflate user-initiated cost totals.

#### Scenario: Batch import flags background
- **WHEN** `import_rezeptkalkulator_ingredients` or `repair_portion_integrity` calls Gemini
- **THEN** the resulting `AiInteraction` SHALL have `is_background=True`
