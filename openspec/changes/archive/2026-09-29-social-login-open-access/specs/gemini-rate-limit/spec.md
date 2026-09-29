## MODIFIED Requirements

### Requirement: Global Gemini call rate limit
The system SHALL keep a cache-based burst guard of 500 Gemini text/image calls per 15-minute window per backend instance, protecting against runaway loops. This guard SHALL NOT be relied upon for cost control; cost control across instances SHALL be enforced by the database-backed budgets defined in `ai-budget`. When the burst guard is exceeded, the system SHALL reject further calls with HTTP 429 and `code: "ai_rate_limited"`.

#### Scenario: Call within limit
- **WHEN** the instance-local call count is below 500 in the current 15-minute window and the tier budget allows the call
- **THEN** the Gemini call proceeds normally and the counter is incremented

#### Scenario: Call exceeds limit
- **WHEN** the instance-local call count has reached 500 in the current 15-minute window
- **THEN** the system returns HTTP 429 with `code: "ai_rate_limited"` and message "KI-Limit erreicht. Bitte versuche es in einigen Minuten erneut."

#### Scenario: Window expiry
- **WHEN** 15 minutes have elapsed since the first call in the current window
- **THEN** the counter resets and new calls are allowed

### Requirement: Authentication required for all Gemini calls
The system SHALL require an authenticated user for every Gemini API call, except for features on the anonymous allowlist defined in `ai-budget` ("Rezept erkennen", "Zutat erkennen"). Callers SHALL declare the feature via a `feature` argument to `gemini_call()`. Anonymous calls for non-allowlisted features MUST be rejected with HTTP 401 and `code: "ai_login_required"`. Anonymous calls for allowlisted features SHALL be charged against the anonymous budget.

#### Scenario: Authenticated user calls Gemini
- **WHEN** an authenticated user triggers an AI feature
- **THEN** the Gemini call proceeds, subject to the user's tier budget and the burst guard

#### Scenario: Unauthenticated user calls Gemini
- **WHEN** an unauthenticated user triggers an AI feature that is not on the anonymous allowlist
- **THEN** the system returns HTTP 401 with `code: "ai_login_required"` and message "KI-Funktionen gibt es nach der kostenlosen Anmeldung."

#### Scenario: Unauthenticated user calls an allowlisted feature
- **WHEN** an unauthenticated user triggers "Rezept erkennen" and the anonymous budget allows it
- **THEN** the Gemini call proceeds and is recorded with `tier="anonymous"` and an `anon_key`

### Requirement: Management command bypass
The system SHALL allow management commands and internal background jobs to bypass rate limiting, budgets and authentication by passing `bypass_limits=True`. Such calls SHALL be recorded with `tier="system"` and SHALL NOT count against any user or anonymous budget.

#### Scenario: Management command calls Gemini
- **WHEN** a management command needs Gemini access for batch operations
- **THEN** it can pass `bypass_limits=True` to skip rate limit, budget and auth checks
- **AND** the interaction is stored with `tier="system"`
