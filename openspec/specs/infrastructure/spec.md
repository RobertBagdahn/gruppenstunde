## MODIFIED Requirements

### Requirement: Ziel-Architektur

Das System SHALL folgende Cloud-Architektur verwenden.

#### Scenario: Architektur-Überblick (konsolidiert)

- **WHEN** die Ziel-Architektur betrachtet wird
- **THEN** besteht sie aus:
  - **GitHub** als Source Repository
  - **Artifact Registry** für Container-Images
- **Cloud Run Frontend** (`inspi-frontend`, europe-west1) — Nginx + SPA auf Port 80
- **Cloud Run Backend** (`inspi-backend`, europe-west1) — Django/Gunicorn auf Port 8000
- **Cloud Run Food Frontend** (`inspi-frontend-food`, europe-west1) — Nginx + SPA auf Port 80
- **Cloud SQL** — Managed PostgreSQL 15, `db-f1-micro`, 10GB `PD_SSD`, Backups aktiviert (europe-west1)
- **GCS Media Bucket** — Benutzer-Uploads
- **Serverless VPC Access Connector** — Cloud Run → Cloud SQL Verbindung

**Geänderte Regionen (gegenüber vorher):**
- `inspi-frontend`: west3 → **west1**
- `inspi-backend`: west3 → **west1**
- `inspi-db`: west3 → **west1**

## ADDED Requirements

### Requirement: Same-Origin API-Routing

Frontend-API-Calls SHALL über den nginx-Proxy der eigenen Cloud-Run-Service laufen, nicht direkt per Cross-Origin-Request zum Backend.

#### Scenario: API-Call durch nginx-Proxy

- **GIVEN** ein User ruft `essensplan.app` oder `gruppenstunde.de` auf
- **WHEN** das Frontend einen API-Call an `/api/auth/me/` sendet
- **THEN** geht der Request durch den nginx-Proxy (`location /api/`)
- **AND** der nginx leitet an `${BACKEND_URL}/api/auth/me/` weiter
- **AND** der Browser sieht die Antwort als same-origin (vom Frontend-Domain)

#### Scenario: Kein VITE_API_URL

- **GIVEN** der Frontend-Build-Prozess
- **WHEN** das Docker-Image gebaut wird
- **THEN** SHALL `VITE_API_URL` leer sein (Default, kein Build-Arg gesetzt)
- **AND** die React-App verwendet relative URLs (`/api/...`)

### Requirement: Cookie-SameSite für Same-Origin

Die Backend-Session- und CSRF-Cookies SHALL `SameSite=Lax` in Produktion verwenden.

#### Scenario: Session-Cookie mit SameSite=Lax

- **GIVEN** ein erfolgreicher Login über den nginx-Proxy
- **WHEN** der Backend `Set-Cookie: sessionid=...` sendet
- **THEN** hat das Cookie `SameSite=Lax` (nicht `None`)
- **AND** der Browser speichert es für das Frontend-Domain (same-origin)

### Requirement: Kein proxy_cookie_path-Hack

Der nginx-Proxy SHALL NICHT `proxy_cookie_path` zur Manipulation von Cookie-Attributen verwenden.

#### Scenario: Cookie-Pass-Through

- **GIVEN** eine Anfrage durch den nginx-Proxy
- **WHEN** das Backend `Set-Cookie`-Header setzt
- **THEN** gibt der nginx diese Header unverändert an den Client weiter
- **AND** es wird kein `proxy_cookie_path` angewendet

### Requirement: DB-Backups aktiviert

Die Cloud SQL-Instanz SHALL tägliche automatisierte Backups haben.

#### Scenario: Backup-Konfiguration

- **GIVEN** eine neue Cloud SQL-Instanz in west1
- **WHEN** die Instanz erstellt wird
- **THEN** sind Backups aktiviert (Fenster 02:00-05:00 MEZ)
- **AND** die Aufbewahrungsdauer beträgt 7 Tage

### Requirement: DB in gleicher Region wie Backend

Die Cloud SQL-Instanz SHALL in derselben Region wie der Backend-Cloud-Run-Service betrieben werden.

#### Scenario: Regionale Kohärenz

- **GIVEN** der Backend-Service in europe-west1
- **WHEN** die DB-Instanz betrieben wird
- **THEN** ist sie ebenfalls in europe-west1
- **AND** der Cloud SQL Auth Proxy funktioniert zuverlässig (same-region)
