## ADDED Requirements

### Requirement: Search logging for recipe and ingredient endpoints

The search logging subsystem SHALL also log queries from the recipe list endpoint (`GET /api/recipes/?q=...`) and the ingredient list endpoint (`GET /api/ingredients/?name=...`), in addition to the existing unified search endpoint. Each log entry SHALL follow the same `SearchLog` schema (query, results_count, user). A `source` discriminator SHALL distinguish log entries by origin endpoint.

#### Scenario: Recipe query logged via SearchLog

- **WHEN** `GET /api/recipes/?q=Pfannkuchen` is called
- **THEN** a `SearchLog` entry SHALL be created with the query `"Pfannkuchen"` and the result count

#### Scenario: Ingredient query logged via SearchLog

- **WHEN** `GET /api/ingredients/?name=Mehl` is called
- **THEN** a `SearchLog` entry SHALL be created with the query `"Mehl"` and the result count

#### Scenario: Structured log output to stdout

- **WHEN** any search endpoint logs a query
- **THEN** a structured JSON log line SHALL be written to stdout with fields `event`, `query`, `results_count`, `user_id`, `timestamp`, `source`
