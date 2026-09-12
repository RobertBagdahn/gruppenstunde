## MODIFIED Requirements

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
