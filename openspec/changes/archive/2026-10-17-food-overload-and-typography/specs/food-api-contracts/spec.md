## MODIFIED Requirements

### Requirement: Food API 5xx errors are safe, typed, and visible
Food API responses for server errors SHALL preserve the HTTP status and return a stable error code, a safe user-facing message, and a request correlation ID. Responses MUST NOT expose stack traces, SQL details, credentials, or other internal diagnostics. The Food frontend SHALL preserve status, code, and correlation ID in its typed API error and show a clear German error state or toast. Retryable reads (HTTP 429, HTTP 5xx, and network failures) SHALL be retried automatically up to two times with backoff, honouring a server `Retry-After` hint of at most 30 seconds; other client errors (4xx except 429) MUST NOT be retried. The frontend SHALL offer an explicit retry for reads that still fail. Mutations MUST NOT be retried automatically; the frontend MUST NOT automatically replay a mutation after an ambiguous server failure.

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

#### Scenario: Overload is retried before an error is shown
- **WHEN** a Food read answers HTTP 429 with `Retry-After: 2`
- **THEN** the frontend SHALL wait about two seconds and retry, at most two times in total
- **AND** the error state SHALL only appear if the last retry fails

#### Scenario: Client error is not retried
- **WHEN** a Food read answers HTTP 404
- **THEN** the frontend SHALL NOT retry it and SHALL show the error immediately
