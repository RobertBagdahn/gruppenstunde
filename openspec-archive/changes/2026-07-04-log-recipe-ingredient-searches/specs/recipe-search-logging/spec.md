## ADDED Requirements

### Requirement: Recipe search logging

The system SHALL log every non-empty search query on the recipe list endpoint (`GET /api/recipes/?q=...`) to the `SearchLog` table. Each log entry SHALL store the query text, the total number of results, and the authenticated user (if any). Additionally, the system SHALL write a structured JSON log line to stdout for ingestion by Cloud Logging.

#### Scenario: Recipe search is logged to SearchLog

- **WHEN** a user calls `GET /api/recipes/?q=Pfannkuchen`
- **THEN** a `SearchLog` entry SHALL be created with `query="Pfannkuchen"`, `results_count=<total matching results>`, `user=<authenticated user or None>`
- **THEN** the response SHALL remain unchanged (no new fields)

#### Scenario: Empty query is not logged

- **WHEN** a user calls `GET /api/recipes/` without a `q` parameter (or `q=""`)
- **THEN** no `SearchLog` entry SHALL be created

#### Scenario: Anonymous recipe search

- **WHEN** an anonymous user calls `GET /api/recipes/?q=Feuer`
- **THEN** a `SearchLog` entry SHALL be created with `user=None`

#### Scenario: Structured JSON log to stdout

- **WHEN** a recipe search is logged
- **THEN** the system SHALL write a JSON line to stdout with keys: `event`, `query`, `results_count`, `user_id`, `timestamp`, `source`
- **THEN** `event` SHALL be `"recipe_search"`
- **THEN** `source` SHALL be `"recipe_list"`
- **THEN** `user_id` SHALL be the user's PK or `null`
