## ADDED Requirements

### Requirement: Token extraction from Gemini response
The system SHALL extract token usage data from every successful Gemini API response and store it in the AiInteraction record.

#### Scenario: Successful text generation captures tokens
- **WHEN** `gemini_call()` receives a successful `GenerateContentResponse` from Gemini
- **THEN** the system SHALL extract `usage_metadata.prompt_token_count` and store it as `prompt_tokens`
- **THEN** the system SHALL extract `usage_metadata.candidates_token_count` and store it as `completion_tokens`
- **THEN** the system SHALL extract `usage_metadata.total_token_count` and store it as `total_tokens`
- **THEN** the system SHALL extract `usage_metadata.thoughts_token_count` (if present) and store it as `thoughts_tokens`

#### Scenario: Failed call attempts token extraction from exception
- **WHEN** `gemini_call()` receives an exception that contains `usage_metadata`
- **THEN** the system SHALL attempt to extract token counts from the exception object
- **THEN** token fields SHALL be populated if available, otherwise remain NULL

#### Scenario: Network error yields no tokens
- **WHEN** `gemini_call()` receives a network-level exception without `usage_metadata`
- **THEN** all token fields SHALL remain NULL
- **THEN** `success` SHALL be `False` and `error_code` SHALL be set

#### Scenario: Gemini SDK not available
- **WHEN** the Gemini client cannot be initialized (GOOGLE_CLOUD_PROJECT not set)
- **THEN** `gemini_call()` SHALL return `(None, interaction_id)`
- **THEN** the interaction record SHALL be updated with `error_code="client_unavailable"`
- **THEN** no tokens SHALL be stored

### Requirement: Cost calculation in EUR
The system SHALL calculate the cost of each Gemini call based on the model's pricing table and store it in EUR.

#### Scenario: Text model cost calculation
- **WHEN** a call to `gemini-3.1-flash-lite` consumes X input tokens and Y output tokens
- **THEN** the cost SHALL be `(X / 1_000_000 * INPUT_PRICE_USD + Y / 1_000_000 * OUTPUT_PRICE_USD) * USD_TO_EUR`
- **THEN** `cost_eur` SHALL be stored as a Decimal with 6 decimal places
- **THEN** `pricing_model` SHALL be set to the model identifier used for pricing lookup

#### Scenario: Image model cost calculation (Phase 1 — vor Modality-Spike)
- **WHEN** a call to `gemini-3.1-flash-image-preview` completes
- **THEN** the system SHALL apply text-token pricing rates ($0,25 input, $1,50 output)
- **THEN** the `image_output_per_1m_usd` rate ($30) SHALL be reserved for activation after modality detection is verified

#### Scenario: Image model cost calculation (Phase 2 — nach Modality-Spike)
- **WHEN** `usage_metadata.prompt_tokens_details` / `candidates_tokens_details` distinguish TEXT vs IMAGE modality
- **THEN** IMAGE-modality tokens SHALL use `image_output_per_1m_usd` rate
- **THEN** TEXT-modality tokens SHALL use standard `output_per_1m_usd` rate

#### Scenario: Embedding model cost calculation
- **WHEN** a call to `gemini-embedding-001` completes
- **THEN** the system SHALL use embedding-specific pricing ($0.00015/1M input)
- **THEN** only input tokens SHALL be charged (output is free)

#### Scenario: Unknown model has no cost
- **WHEN** a model not listed in `GEMINI_PRICING` is called
- **THEN** `cost_eur` SHALL remain NULL
- **THEN** `pricing_model` SHALL be set to the model name for audit purposes

#### Scenario: Calculation uses fixed EUR conversion
- **WHEN** cost is calculated in USD
- **THEN** the system SHALL multiply by `settings.USD_TO_EUR` (default 0.92)
- **THEN** the result SHALL be quantized to 6 decimal places

### Requirement: Background call flagging
The system SHALL distinguish between user-initiated AI calls and system/background calls using an `is_background` flag on AiInteraction records.

#### Scenario: User request is not background
- **WHEN** an authenticated user triggers an AI feature through the API
- **THEN** `is_background` SHALL be `False`

#### Scenario: Management command is background
- **WHEN** a management command calls `gemini_call()` with `is_background=True`
- **THEN** the `AiInteraction` record SHALL have `is_background=True`
- **THEN** the record SHALL be excluded from user-cost aggregations

#### Scenario: Embedding calls are always background
- **WHEN** `gemini_embed()` creates an `AiInteraction` record
- **THEN** `is_background` SHALL be `True`

### Requirement: Auth check before logging
The system SHALL verify authentication before creating an AiInteraction database record.

#### Scenario: Unauthenticated request creates no log
- **WHEN** `gemini_call()` is called with an unauthenticated user and `bypass_limits=False`
- **THEN** the system SHALL raise `GeminiAuthError` (403) before calling `_create_interaction()`
- **THEN** no `AiInteraction` record SHALL be created

#### Scenario: Authenticated request creates log
- **WHEN** `gemini_call()` is called with an authenticated user
- **THEN** the system SHALL create an `AiInteraction` record after successful auth check

### Requirement: Prompt truncation for image payloads
The system SHALL truncate large binary image data from prompts before storing them in the database.

#### Scenario: Text-only prompt stored as-is
- **WHEN** `contents` is a plain string or a list of text-only parts
- **THEN** the prompt SHALL be stored in full

#### Scenario: Image-containing prompt is truncated
- **WHEN** `contents` contains base64-encoded image data
- **THEN** image data SHALL be replaced with a placeholder `[Bilddaten: N Bytes]`
- **THEN** text parts of the prompt SHALL be preserved

### Requirement: Pricing table in Django settings
The system SHALL define a `GEMINI_PRICING` dictionary in Django settings mapping model names to their pricing configuration.

#### Scenario: Pricing lookup for known model
- **WHEN** calculating cost for `gemini-3.1-flash-lite`
- **THEN** the system SHALL look up `settings.GEMINI_PRICING["gemini-3.1-flash-lite"]`
- **THEN** the entry SHALL contain `type`, `input_per_1m_usd`, and `output_per_1m_usd`

#### Scenario: Missing pricing entry
- **WHEN** calculating cost for a model not in `GEMINI_PRICING`
- **THEN** `cost_eur` SHALL be set to `None`
- **THEN** a warning SHALL be logged
