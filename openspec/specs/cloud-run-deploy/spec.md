# cloud-run-deploy Specification

## Purpose

Makefile-basiertes Deployment von Frontend und Backend als separate Cloud Run Services, inklusive Container-Builds mit Podman, Artifact Registry Push, und GCP-Infrastruktur-Setup.

## Context

- **Frontend**: Nginx-basierter Container mit Static Files + API Reverse Proxy
- **Backend**: Django/Gunicorn Container mit Cloud SQL Anbindung via VPC Connector
- **Tooling**: Makefile-Targets für Build, Push, Deploy und Infrastruktur-Setup
- **Registry**: Google Artifact Registry (europe-west3)

## Requirements

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

### Requirement: Preflight vor manuellen Deploys
Der Deploy-Skill SHALL vor jedem manuellen Deploy mit `gcloud` oder `make` prüfen und anzeigen: ob ein CI-Deploy (`deploy.yml`) läuft oder wartet, ob der lokale Stand von `origin/main` abweicht, ob in den letzten 15 Minuten eine Revision entstanden ist (Ersteller und Alter der letzten 5 Revisionen; dasselbe Konto kann aus einer anderen Session stammen, deshalb gilt jede junge Revision als Befund), und, falls die Änderung Scaling- oder Gunicorn-Werte betrifft, die vier Dateien, die gemeinsam zu ändern sind (`deploy.yml`, `Dockerfile.backend`, Terraform, `Makefile`). Der Skill MUST bei jedem Befund eine ausdrückliche Bestätigung verlangen und den Weg „Fix nach `main`, CI deployt“ nennen. Der Skill MUST NICHT ohne diese Bestätigung deployen.

#### Scenario: CI-Deploy läuft
- **GIVEN** ein CI-Deploy von `main` ist in Arbeit
- **WHEN** der Nutzer einen manuellen Deploy startet
- **THEN** zeigt der Skill den Lauf, warnt, dass die CI manuelle Werte überschreibt, und fragt nach Bestätigung

#### Scenario: Branch weicht von main ab
- **GIVEN** der Deploy-Stand ist nicht `origin/main`
- **WHEN** der Preflight läuft
- **THEN** zeigt der Skill die Abweichung und weist darauf hin, dass der nächste CI-Deploy den Stand ersetzt

#### Scenario: Andere Session hat gerade deployt
- **GIVEN** die letzte Revision ist 8 Minuten alt, auch wenn sie vom selben Konto stammt
- **WHEN** der Preflight läuft
- **THEN** nennt der Skill Revision, Ersteller und Alter und fragt nach Bestätigung

#### Scenario: Scaling-Änderung
- **WHEN** die Änderung Concurrency oder maximale Instanzen betrifft
- **THEN** nennt der Skill die vier Dateien und dass `test_runtime_limits` ihre Übereinstimmung erzwingt

#### Scenario: Sauberer Zustand
- **GIVEN** kein CI-Lauf, Stand gleich `origin/main`, keine Revision in den letzten 15 Minuten
- **WHEN** der Preflight läuft
- **THEN** meldet der Skill „keine Befunde“ und deployt nach der üblichen Bestätigung
