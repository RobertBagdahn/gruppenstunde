## ADDED Requirements

### Requirement: Frontend Container serves static files and proxies API

The system SHALL serve the React frontend as static files via Nginx and proxy all `/api/*` requests to the Backend Cloud Run service.

#### Scenario: Static file serving

- **WHEN** a user requests any path not matching `/api/*`
- **THEN** Nginx serves the corresponding file from the Vite build output, falling back to `index.html` for SPA routing

#### Scenario: API proxy

- **WHEN** a user requests a path matching `/api/*`
- **THEN** Nginx proxies the request to the Backend Cloud Run URL (injected via `BACKEND_URL` env var)
- **AND** preserves all headers including cookies

#### Scenario: Backend URL injection at runtime

- **WHEN** the Frontend container starts
- **THEN** `envsubst` replaces `$BACKEND_URL` in the Nginx config template
- **AND** Nginx starts with the resolved config

### Requirement: Backend connects to Cloud SQL via Private IP

The system SHALL connect to a Cloud SQL PostgreSQL instance via Private IP using a VPC Connector.

#### Scenario: Database connection in production

- **WHEN** the Backend Cloud Run service starts with `DJANGO_SETTINGS_MODULE=inspi.settings.production`
- **THEN** it connects to Cloud SQL using `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` env vars
- **AND** the connection uses the VPC Connector for Private IP access

### Requirement: Makefile provides setup-infra target

The system SHALL provide a `make setup-infra` target that creates all required GCP resources.

#### Scenario: First-time infrastructure setup

- **WHEN** a developer runs `make setup-infra`
- **THEN** the following resources are created:
  - Artifact Registry repository
  - Serverless VPC Access Connector
  - Cloud SQL instance with database and user

### Requirement: Makefile provides deploy targets

The system SHALL provide Makefile targets to build, push, and deploy both services.

#### Scenario: Full deployment

- **WHEN** a developer runs `make deploy`
- **THEN** Backend is built, pushed, and deployed first
- **AND** Frontend is built, pushed, and deployed second with the Backend URL as env var

#### Scenario: Individual service deployment

- **WHEN** a developer runs `make deploy-backend` or `make deploy-frontend`
- **THEN** only the specified service is built, pushed, and deployed
