## ADDED Requirements

### Requirement: Backend and database SHALL be colocated in the same region

The backend Cloud Run service `inspi-backend` SHALL run in the same region as the Cloud SQL database `inspi-db` to ensure reliable database connectivity and schema resolution.

Justification: Cloud Run's built-in Cloud SQL Auth Proxy is only guaranteed to work correctly within a single region. Cross-region connections can cause intermittent `column does not exist` errors.

#### Scenario: Backend is deployed in europe-west3

- **WHEN** the `inspi-backend` service is deployed via `gcloud run deploy`
- **THEN** the region parameter SHALL be `europe-west3`
- **AND** the service SHALL be reachable at a `*.europe-west3.run.app` URL

#### Scenario: Database connection is stable

- **WHEN** the backend receives a request that queries the `content_tag` table
- **THEN** the system SHALL return HTTP 200 (not 500 with `column does not exist`)

### Requirement: Old europe-west1 service SHALL be deleted

After the new service in `europe-west3` is verified as operational, the old `inspi-backend` service in `europe-west1` SHALL be deleted to prevent configuration drift and accidental traffic routing.

#### Scenario: Old service is deleted

- **WHEN** the new `europe-west3` service is verified (HTTP 200 on `/api/docs`)
- **THEN** the old `europe-west1` service SHALL be deleted via `gcloud run services delete`

### Requirement: CORS origins SHALL include the new backend URL

The Django production settings SHALL include the new `europe-west3` backend URL in both `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`.

#### Scenario: CORS is configured correctly

- **WHEN** a frontend makes a cross-origin request to the new backend URL
- **THEN** the response SHALL include the `Access-Control-Allow-Origin` header with the frontend origin

### Requirement: Deploy skill region constants SHALL be accurate

The deploy skill at `.opencode/skills/deploy/SKILL.md` SHALL have its backend region constant set to `europe-west3` and the Backend URL constant set to the actual `europe-west3` service URL.

#### Scenario: Deploy skill reflects correct region after migration

- **WHEN** the deploy skill is used for the next backend deployment
- **THEN** the `--region europe-west3` flag SHALL be used
- **AND** the `Backend URL` constant SHALL match the actual service URL
