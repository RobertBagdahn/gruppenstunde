## ADDED Requirements

### Requirement: Ingredient search logging

The system SHALL log every non-empty name search on the ingredient list endpoint (`GET /api/ingredients/?name=...`) to the `SearchLog` table. Each log entry SHALL store the query text, the total number of matching ingredients, and the authenticated user (if any). Additionally, the system SHALL write a structured JSON log line to stdout for ingestion by Cloud Logging.

#### Scenario: Ingredient search is logged to SearchLog

- **WHEN** a user calls `GET /api/ingredients/?name=Mehl`
- **THEN** a `SearchLog` entry SHALL be created with `query="Mehl"`, `results_count=<total matching ingredients>`, `user=<authenticated user or None>`
- **THEN** the response SHALL remain unchanged (no new fields)

#### Scenario: Empty name filter is not logged

- **WHEN** a user calls `GET /api/ingredients/` without a `name` parameter (or `name=""`)
- **THEN** no `SearchLog` entry SHALL be created

#### Scenario: Anonymous ingredient search

- **WHEN** an anonymous user calls `GET /api/ingredients/?name=Mehl`
- **THEN** a `SearchLog` entry SHALL be created with `user=None`

#### Scenario: Structured JSON log to stdout

- **WHEN** an ingredient search is logged
- **THEN** the system SHALL write a JSON line to stdout with keys: `event`, `query`, `results_count`, `user_id`, `timestamp`, `source`
- **THEN** `event` SHALL be `"ingredient_search"`
- **THEN** `source` SHALL be `"ingredient_list"`
- **THEN** `user_id` SHALL be the user's PK or `null`
