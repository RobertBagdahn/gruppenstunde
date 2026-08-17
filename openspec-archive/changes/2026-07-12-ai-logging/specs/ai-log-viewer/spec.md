## ADDED Requirements

### Requirement: Paginated AI interaction list for admins
The system SHALL provide a paginated, filterable list of AI interactions accessible only to staff users.

#### Scenario: Staff user lists all interactions
- **WHEN** a staff user sends `GET /api/content/admin/ai-interactions/`
- **THEN** the response SHALL include `items`, `total`, `page`, `page_size`, `total_pages`
- **THEN** each item SHALL contain: `id`, `context`, `model`, `user_name` (or null), `created_at`, `total_tokens`, `cost_eur`, `duration_ms`, `success`, `error_code`, `vote`, `is_background`
- **THEN** items SHALL be ordered by `created_at` descending
- **THEN** items SHALL NOT include `prompt` or `response` fields (performance)

#### Scenario: Filter by context
- **WHEN** `GET /api/content/admin/ai-interactions/?context=improve_text`
- **THEN** only interactions with `context="improve_text"` SHALL be returned

#### Scenario: Filter by user
- **WHEN** `GET /api/content/admin/ai-interactions/?user_id=42`
- **THEN** only interactions for user ID 42 SHALL be returned

#### Scenario: Filter by success status
- **WHEN** `GET /api/content/admin/ai-interactions/?success=false`
- **THEN** only failed interactions SHALL be returned

#### Scenario: Filter by background status
- **WHEN** `GET /api/content/admin/ai-interactions/?is_background=true`
- **THEN** only background/system interactions SHALL be returned

#### Scenario: Filter by vote status
- **WHEN** `GET /api/content/admin/ai-interactions/?has_vote=true`
- **THEN** only interactions with a vote (up or down) SHALL be returned

#### Scenario: Filter by date range
- **WHEN** `GET /api/content/admin/ai-interactions/?date_from=2026-07-01&date_to=2026-07-31`
- **THEN** only interactions created within that date range SHALL be returned

#### Scenario: Text search
- **WHEN** `GET /api/content/admin/ai-interactions/?search=Fehler`
- **THEN** only interactions whose `response` or serialized `prompt` contain "Fehler" SHALL be returned

#### Scenario: Non-staff user is denied
- **WHEN** a non-staff user sends `GET /api/content/admin/ai-interactions/`
- **THEN** HTTP 403 SHALL be returned

#### Scenario: Pagination with custom page size
- **WHEN** `GET /api/content/admin/ai-interactions/?page=2&page_size=50`
- **THEN** the response SHALL return page 2 with 50 items per page

### Requirement: AI interaction detail endpoint
The system SHALL provide a detail endpoint that returns the full prompt and response for a single interaction.

#### Scenario: Staff user views interaction detail
- **WHEN** a staff user sends `GET /api/content/admin/ai-interactions/{id}/`
- **THEN** the response SHALL include all fields from the list response plus `prompt` (JSON) and `response` (string)

#### Scenario: Non-existent interaction
- **WHEN** `GET /api/content/admin/ai-interactions/{nonexistent-id}/`
- **THEN** HTTP 404 with message "Interaktion nicht gefunden" SHALL be returned

#### Scenario: Non-staff user is denied
- **WHEN** a non-staff user sends `GET /api/content/admin/ai-interactions/{id}/`
- **THEN** HTTP 403 SHALL be returned

### Requirement: User cost breakdown
The system SHALL provide a per-user cost aggregation for AI usage, excluding background calls.

#### Scenario: Staff user views user costs
- **WHEN** a staff user sends `GET /api/content/admin/ai-interactions/user-costs/`
- **THEN** the response SHALL be a list of per-user aggregates
- **THEN** each entry SHALL contain: `user_id`, `user_name`, `total_calls`, `total_tokens`, `total_cost_eur`, `cost_30d_eur`, `vote_rate`
- **THEN** only `is_background=False` and `user__isnull=False` records SHALL be counted
- **THEN** `cost_30d_eur` SHALL be the sum of costs in the last 30 days
- **THEN** entries SHALL be ordered by `total_cost_eur` descending

#### Scenario: Users with no cost are excluded
- **WHEN** a user has only background or zero-cost interactions
- **THEN** they SHALL NOT appear in the user costs list

### Requirement: Extended stats with cost information
The existing AI interaction stats endpoint SHALL be extended to include cost metrics.

#### Scenario: Stats include cost totals
- **WHEN** a staff user sends `GET /api/content/admin/ai-interactions/stats/`
- **THEN** the response SHALL include `total_cost_eur` (sum of non-background costs)
- **THEN** the response SHALL include `total_tokens_all` (sum of non-background tokens)
- **THEN** `by_context` entries SHALL include `total_cost_eur` and `total_tokens` fields
- **THEN** default: background calls SHALL be excluded from all aggregate values

#### Scenario: Stats optionally include background calls
- **WHEN** a staff user sends `GET /api/content/admin/ai-interactions/stats/?include_background=true`
- **THEN** all aggregate values SHALL include `is_background=True` records

### Requirement: Admin frontend pages for AI monitoring
The system SHALL provide three separate admin pages in the frontend for AI interaction monitoring.

#### Scenario: KI-Log page
- **WHEN** a staff user navigates to the KI-Log admin page
- **THEN** a paginated table SHALL display recent AI interactions with filter controls
- **THEN** clicking an interaction SHALL expand to show full `prompt` (formatted JSON) and `response` (text)
- **THEN** filters SHALL include: context dropdown, user search, success/error toggle, date range picker, background toggle

#### Scenario: KI-Kosten page
- **WHEN** a staff user navigates to the KI-Kosten admin page
- **THEN** a table SHALL display per-user costs with columns: User, Calls, Tokens, Kosten (Gesamt), Kosten (30 Tage), Vote-Rate
- **THEN** rows SHALL be sorted by total cost descending

#### Scenario: KI-Stats page
- **WHEN** a staff user navigates to the KI-Stats admin page
- **THEN** the existing stats display SHALL be augmented with cost totals and token totals

#### Scenario: Admin pages require staff authentication
- **WHEN** a non-staff user navigates to any KI admin page
- **THEN** an error state SHALL be displayed indicating insufficient permissions
