## ADDED Requirements

### Requirement: Food API 5xx errors are safe, typed, and visible
Food API responses for server errors SHALL preserve the HTTP status and return a stable error code, a safe user-facing message, and a request correlation ID. Responses MUST NOT expose stack traces, SQL details, credentials, or other internal diagnostics. The Food frontend SHALL preserve status, code, and correlation ID in its typed API error and show a clear German error state or toast. It SHALL offer a retry for retryable reads and explicit user-controlled retry for mutations; it MUST NOT automatically replay a mutation after an ambiguous server failure.

#### Scenario: Food API returns HTTP 500
- **WHEN** a Food endpoint returns HTTP 500 with the standard error contract
- **THEN** the frontend SHALL identify the error as a server failure rather than a generic parsing or network error
- **THEN** the user SHALL see a German message that the server failed, the status code, and a support reference when available
- **THEN** the UI SHALL preserve entered form and selection state

#### Scenario: Server error response has no parseable body
- **WHEN** a Food endpoint returns HTTP 5xx with an empty, malformed, or non-JSON response body
- **THEN** the frontend SHALL still preserve the HTTP status and show the safe German fallback message
- **THEN** the UI MUST NOT display a JavaScript parsing error as the cause

#### Scenario: Retry after server failure
- **WHEN** a retryable Food read fails with HTTP 5xx and the user selects “Erneut versuchen”
- **THEN** the frontend SHALL retry that read and replace the error state with the response state
- **WHEN** a mutation fails with an ambiguous HTTP 5xx
- **THEN** the frontend SHALL keep the user's inputs and require an explicit retry action without automatically submitting a duplicate mutation
