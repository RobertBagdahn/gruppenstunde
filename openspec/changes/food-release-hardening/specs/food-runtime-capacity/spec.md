## ADDED Requirements

### Requirement: Cloud Run database connections stay within the database budget
The deployment SHALL set a database-connection budget that accounts for Cloud Run maximum instances, request concurrency, Gunicorn workers and threads, background workers, and Django connection lifetime. The maximum possible application connections MUST remain below the configured Cloud SQL connection limit with reserved capacity for migrations, administration, and health checks. Runtime settings SHALL have one declared source of truth and MUST NOT silently drift from infrastructure configuration.

#### Scenario: Scale reaches configured maximum
- **WHEN** Cloud Run scales the backend to its configured maximum under the maximum supported request load
- **THEN** the maximum possible application connections SHALL remain within the declared database budget
- **THEN** connection exhaustion SHALL not cause user requests to fail with HTTP 500

#### Scenario: Short-lived and background database work
- **WHEN** a request or background task completes
- **THEN** its database connection SHALL be released according to the configured connection policy
- **THEN** background task concurrency SHALL be included in the same connection budget

### Requirement: Ingredient distribution processing has bounded resource use
Ingredient-statistics distribution endpoints SHALL process verified ingredient data with bounded peak memory and a bounded number of concurrent expensive computations. They MUST NOT materialize unbounded duplicate representations of the full ingredient dataset per request when database-side aggregation or bounded iteration can provide the required result.

#### Scenario: Concurrent distribution requests
- **WHEN** multiple distribution requests for different fields run concurrently against the complete ingredient dataset
- **THEN** each request SHALL stay within its declared memory budget
- **THEN** load SHALL NOT cause the backend container to exceed its memory limit

### Requirement: Backend capacity failures are observable
The backend SHALL emit structured operational signals for database connection saturation and container memory pressure, including service/revision and request correlation where applicable, without logging credentials or user-submitted private content.

#### Scenario: Database capacity approaches its budget
- **WHEN** available database connection capacity crosses the configured warning threshold
- **THEN** operators SHALL be able to identify the affected service and revision before requests begin failing
