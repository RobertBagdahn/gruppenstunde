# Spec Delta: infrastructure

## MODIFIED Requirements

### Requirement: Ziel-Architektur

Das System SHALL folgende Cloud-Architektur verwenden.

#### Scenario: Architektur-Überblick (konsolidiert)

- **WHEN** die Ziel-Architektur betrachtet wird
- **THEN** besteht sie aus:
  - **GitHub** als Source Repository
  - **Artifact Registry** für Container-Images
- **Cloud Run Konto-Frontend** (`inspi-frontend-konto`, europe-west1, Domain `konto.gruppenstunde.de`) — Nginx + SPA auf Port 80
- **Cloud Run Gruppenstunde-Frontend** (`inspi-frontend`, europe-west1, Domain `gruppenstunde.de`) — Nginx + SPA auf Port 80
- **Cloud Run Anmelde-Frontend** (`inspi-frontend-events`, europe-west1, eigene Anmelde-Domain) — Nginx + SPA auf Port 80
- **Cloud Run Food Frontend** (`inspi-frontend-food`, europe-west1, Domain `essensplan.app`) — Nginx + SPA auf Port 80
- **Cloud Run Backend** (`inspi-backend`, europe-west1) — ein gemeinsamer Django/Gunicorn-Service auf Port 8000 für alle Apps
- **Cloud SQL** — Managed PostgreSQL 15, `db-f1-micro`, 10GB `PD_SSD`, Backups aktiviert (europe-west1), eine gemeinsame Datenbank
- **GCS Media Bucket** — Benutzer-Uploads
- **Serverless VPC Access Connector** — Cloud Run → Cloud SQL Verbindung

**Geänderte Regionen (gegenüber vorher):**
- `inspi-frontend`: west3 → **west1**
- `inspi-backend`: west3 → **west1**
- `inspi-db`: west3 → **west1**

#### Scenario: Jede App über ihren eigenen Proxy
- **WHEN** eine der vier Apps `/api/*` aufruft
- **THEN** geht der Request über den nginx-Proxy des eigenen Frontend-Services an `inspi-backend`
- **AND** das Backend erkennt die App am `X-Forwarded-Host` und akzeptiert nur erlaubte Origins
