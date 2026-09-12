## MODIFIED Requirements

### Requirement: Extended stats with cost information
The existing AI interaction stats endpoint SHALL be extended to include cost, model and embedding metrics.

#### Scenario: Stats include cost totals
- **WHEN** a staff user sends `GET /api/content/admin/ai-interactions/stats/`
- **THEN** the response SHALL include `total_cost_eur` (sum of non-background costs)
- **THEN** the response SHALL include `total_tokens_all` (sum of non-background tokens)
- **THEN** `by_context` entries SHALL include `total_cost_eur` and `total_tokens` fields
- **THEN** default: background calls SHALL be excluded from all aggregate values

#### Scenario: Stats include model breakdown
- **WHEN** a staff user sends `GET /api/content/admin/ai-interactions/stats/`
- **THEN** the response SHALL include a `by_model` array
- **THEN** each `by_model` entry SHALL contain: `model`, `total_calls`, `total_tokens`, `total_cost_eur`, `thumbs_up`, `thumbs_down`
- **THEN** entries SHALL be ordered by `total_calls` descending
- **THEN** default: background calls SHALL be excluded from the model breakdown

#### Scenario: Timeline entries include embedding costs
- **WHEN** a staff user sends `GET /api/content/admin/ai-interactions/stats/`
- **THEN** each `timeline` entry SHALL include `embedding_cost_eur` (sum of costs of background/embedding calls on that day)
- **THEN** `embedding_cost_eur` SHALL be `0` when no embedding calls occurred on that day

#### Scenario: Stats optionally include background calls
- **WHEN** a staff user sends `GET /api/content/admin/ai-interactions/stats/?include_background=true`
- **THEN** all aggregate values SHALL include `is_background=True` records
