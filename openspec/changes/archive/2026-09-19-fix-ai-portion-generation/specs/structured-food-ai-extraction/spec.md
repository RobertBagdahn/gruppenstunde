## ADDED Requirements

### Requirement: Structured Food and recipe extraction uses validated JSON
Food- and recipe-related Gemini calls that request structured output SHALL use a Pydantic response schema and JSON response MIME type. The shared Gemini client SHALL reject empty or schema-invalid responses before returning them to the service.

#### Scenario: Valid structured response
- **WHEN** Gemini returns non-empty JSON matching the configured Pydantic schema
- **THEN** the client SHALL return the response to the calling service
- **THEN** the service SHALL not need to extract JSON from Markdown or arbitrary prose

#### Scenario: Empty structured response
- **WHEN** Gemini returns an empty response for a structured Food- or recipe-extraction call
- **THEN** the client SHALL issue exactly one correction retry
- **THEN** the retry prompt SHALL require only valid JSON matching the configured schema

### Requirement: Invalid structured output receives one correction retry
The shared client SHALL retry a structured Food- or recipe-extraction call exactly once when JSON parsing or Pydantic validation fails. After a second invalid response it MUST return a clear structured-response error and MUST NOT silently pass partial data to the caller.

#### Scenario: First response fails schema validation
- **WHEN** the first structured response has invalid JSON or missing required fields
- **THEN** the client SHALL make one correction retry
- **THEN** the retry SHALL retain the original extraction context

#### Scenario: Both attempts fail
- **WHEN** both structured responses fail validation
- **THEN** the client SHALL return an HTTP 502-compatible AI response error
- **THEN** the calling service SHALL not persist partial extracted data

### Requirement: Extraction schemas define domain minimums
Each structured Food- or recipe-extraction schema SHALL define domain-specific minimum requirements, such as at least one ingredient, one step, or one usable suggestion where the operation requires data.

#### Scenario: Syntactically valid but empty recipe extraction
- **WHEN** Gemini returns valid JSON with an empty required recipe-step or ingredient list
- **THEN** schema validation SHALL fail or the service SHALL reject the result as domain-invalid
- **THEN** the client SHALL perform the configured correction retry before failing

### Requirement: Retry attempts remain auditable as one operation
Structured retries SHALL remain associated with the same user operation and SHALL record the retry attempt and validation failure reason without losing the final response status.

#### Scenario: Retry is needed
- **WHEN** a structured extraction requires correction
- **THEN** the AI interaction audit SHALL identify that a retry occurred
- **THEN** the final success or failure SHALL remain attributable to the original operation

### Requirement: Backend and Food frontend contracts deploy together
Changes to structured response enums or fields used by Food APIs SHALL be built, contract-tested and deployed together with the corresponding Food frontend Zod schema.

#### Scenario: New package operation is introduced
- **WHEN** the backend adds an operation value such as `package`
- **THEN** the Food frontend schema SHALL accept it before backend traffic can return it
- **THEN** a contract test SHALL parse a preview containing both portion and package operations
