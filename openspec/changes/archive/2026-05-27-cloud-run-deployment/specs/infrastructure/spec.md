## MODIFIED Requirements

### Requirement: Ziel-Architektur

Das System SHALL folgende Cloud-Architektur verwenden.

#### Scenario: Architektur-Überblick

- **WHEN** die Ziel-Architektur betrachtet wird
- **THEN** besteht sie aus:
  - **GitHub** als Source Repository
  - **Artifact Registry** für Container-Images
  - **Cloud Run Frontend** (`inspi-frontend`) — Nginx Reverse Proxy + Static Files auf Port 80
  - **Cloud Run Backend** (`inspi-backend`) — Django/Gunicorn auf Port 8000
  - **Cloud SQL** — Managed PostgreSQL (Private IP)
  - **GCS Media Bucket** — Benutzer-Uploads
  - **Serverless VPC Access Connector** — Cloud Run → Cloud SQL Verbindung

### Requirement: Container-Builds mit Podman

Das System SHALL lokale Container-Builds mit Podman unterstützen.

#### Scenario: Produktion Images lokal bauen

- **WHEN** ein Entwickler Produktion-Images bauen will
- **THEN** verwendet er:
  - `make build-backend` — `podman build -f Dockerfile.backend`
  - `make build-frontend` — `podman build -f Dockerfile.frontend`
  - `make push-backend` — `podman push` zu Artifact Registry
  - `make push-frontend` — `podman push` zu Artifact Registry

### Requirement: Cloud Run Deployment

Das System SHALL die Cloud Run Service-Konfiguration definieren.

#### Scenario: Backend Service (inspi-backend)

- **WHEN** der Backend Cloud Run Service deployed wird
- **THEN** hat er folgende Konfiguration:
  - Image: `europe-west3-docker.pkg.dev/$PROJECT/inspi/backend:latest`
  - Port: 8000
  - CPU: 1, Memory: 512Mi
  - Min Instances: 0, Max: 10
  - VPC Connector für Cloud SQL Private IP Zugang
  - Env Vars: `DJANGO_SETTINGS_MODULE`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - Allow unauthenticated: Ja

#### Scenario: Frontend Service (inspi-frontend)

- **WHEN** der Frontend Cloud Run Service deployed wird
- **THEN** hat er folgende Konfiguration:
  - Image: `europe-west3-docker.pkg.dev/$PROJECT/inspi/frontend:latest`
  - Port: 80
  - CPU: 1, Memory: 256Mi
  - Min Instances: 0, Max: 5
  - Env Vars: `BACKEND_URL` (Backend Cloud Run URL)
  - Allow unauthenticated: Ja

## REMOVED Requirements

### Requirement: Datenbank-Migration (Cloud SQL zu Cloud Run PostgreSQL)

**Reason**: Cloud SQL bleibt die Datenbank. Kein self-hosted PostgreSQL Container mehr.
**Migration**: `Dockerfile.db` und `deploy-db` Target werden gelöscht.
