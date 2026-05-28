## ADDED Requirements

### Requirement: Global Gemini call rate limit
The system SHALL enforce a global rate limit of 100 Gemini API calls per 15-minute window across all services and all users. When the limit is exceeded, the system SHALL reject further calls with HTTP 429.

#### Scenario: Call within limit
- **WHEN** the global call count is below 100 in the current 15-minute window
- **THEN** the Gemini call proceeds normally and the counter is incremented

#### Scenario: Call exceeds limit
- **WHEN** the global call count has reached 100 in the current 15-minute window
- **THEN** the system returns HTTP 429 with message "KI-Limit erreicht. Bitte versuche es in einigen Minuten erneut."

#### Scenario: Window expiry
- **WHEN** 15 minutes have elapsed since the first call in the current window
- **THEN** the counter resets and new calls are allowed

### Requirement: Authentication required for all Gemini calls
The system SHALL require an authenticated user for every Gemini API call. Unauthenticated requests MUST be rejected with HTTP 403.

#### Scenario: Authenticated user calls Gemini
- **WHEN** an authenticated user triggers an AI feature
- **THEN** the Gemini call proceeds (subject to rate limits)

#### Scenario: Unauthenticated user calls Gemini
- **WHEN** an unauthenticated user triggers an AI feature
- **THEN** the system returns HTTP 403 with message "Anmeldung erforderlich"

### Requirement: Centralized Gemini client
The system SHALL provide a single `gemini_call()` function that all services MUST use for Gemini text generation. Direct instantiation of `genai.Client` outside the central module is not permitted.

#### Scenario: Service makes a Gemini call
- **WHEN** any service needs to call Gemini for text generation
- **THEN** it uses `core.services.gemini.gemini_call()` with user, model, contents, and optional config

#### Scenario: Image generation call
- **WHEN** a service needs Gemini image generation
- **THEN** it uses `core.services.gemini.gemini_image_call()` with the same signature pattern

### Requirement: Centralized error handling
The system SHALL handle Gemini API errors centrally. Google 429 responses, invalid responses, and connection errors MUST be translated to appropriate HTTP errors.

#### Scenario: Google returns 429
- **WHEN** the Gemini API returns a 429 rate limit error
- **THEN** the system raises HTTP 429 with message "KI ist gerade überlastet. Bitte versuche es in einer Minute erneut."

#### Scenario: Gemini returns empty/invalid response
- **WHEN** the Gemini API returns an empty or unparseable response
- **THEN** the system raises HTTP 502 with message "KI-Antwort ungültig. Bitte versuche es erneut."

#### Scenario: Connection error to Gemini
- **WHEN** the connection to Gemini API fails
- **THEN** the system raises HTTP 503 with message "KI nicht erreichbar. Bitte versuche es später erneut."

### Requirement: Management command bypass
The system SHALL allow management commands to bypass rate limiting and authentication by passing a system user flag.

#### Scenario: Management command calls Gemini
- **WHEN** a management command needs Gemini access for batch operations
- **THEN** it can pass `bypass_limits=True` to skip rate limit and auth checks
