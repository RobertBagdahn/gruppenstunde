## MODIFIED Requirements

### Requirement: Cloud Run database connections stay within the database budget
The deployment configuration SHALL declare a database-connection envelope that accounts for Cloud Run maximum instances, request concurrency, Gunicorn workers and threads, background workers, and Django connection lifetime. A capacity-check command MUST compare the configured application maximum with the database connection limit and an explicit reserve. The GitHub Actions deploy workflow (the single production pipeline), `Dockerfile.backend`, the Terraform defaults and the Makefile MUST use consistent values; proposed defaults MUST NOT be represented as production-validated until measured. The production defaults SHALL be 3 maximum instances, request concurrency 4, one Gunicorn worker with 4 threads and one background worker per process, against a `db-g1-small` Cloud SQL instance.

#### Scenario: Capacity preflight exceeds the declared budget
- **WHEN** the capacity-check command calculates a maximum application connection count above the database budget
- **THEN** the command SHALL exit with an error that identifies the capacity mismatch
- **THEN** the configured maximum and reserve SHALL be included in its report

#### Scenario: Production defaults fit the budget
- **GIVEN** 3 instances × (4 request threads + 1 background worker)
- **WHEN** the capacity-check command runs against the production database limit
- **THEN** the 15 application connections plus reserve SHALL fit and the command SHALL succeed

#### Scenario: Short-lived and background database work
- **WHEN** a request or background task completes
- **THEN** its database connection SHALL be released according to the configured connection policy
- **THEN** background task concurrency SHALL be included in the same connection budget

### Requirement: Backend capacity failures are observable
The backend SHALL emit structured operational signals for database connection saturation and container memory pressure, including service/revision and request correlation where applicable, without logging credentials or user-submitted private content. Cloud Monitoring SHALL alert when the backend returns HTTP 429 to clients, when the backend p95 request latency exceeds 5 s over 10 minutes, and when an uptime check of the public API fails.

#### Scenario: Database capacity approaches its budget
- **WHEN** available database connection capacity crosses the configured warning threshold
- **THEN** operators SHALL be able to identify the affected service and revision before requests begin failing

#### Scenario: Instances are exhausted
- **WHEN** Cloud Run answers backend requests with HTTP 429 within a 5-minute window
- **THEN** an alert SHALL be sent to the configured notification channels

#### Scenario: Backend becomes slow
- **WHEN** the backend p95 request latency stays above 5 s for 10 minutes
- **THEN** an alert SHALL be sent to the configured notification channels

#### Scenario: API unreachable
- **WHEN** the uptime check of an unauthenticated public API endpoint fails from multiple regions
- **THEN** an alert SHALL be sent to the configured notification channels
