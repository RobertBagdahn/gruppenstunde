# infrastructure Specification

## Purpose

Infrastruktur, Deployment und CI/CD-Konfiguration für die Inspi-Plattform. Definiert die Ziel-Architektur (Google Cloud Run), Container-Builds (Podman), CI/CD-Pipeline (Google Cloud Build), Infrastruktur-as-Code (OpenTofu) und den Migrationsplan von App Engine/Cloud SQL.

## Context

- **Hosting**: Google Cloud Run (Migration von App Engine)
- **Datenbank**: Cloud SQL PostgreSQL (kostenoptimiert)
- **Container Runtime**: Podman (lokal), Docker (Cloud Build CI)
- **CI/CD**: Google Cloud Build (nicht GitHub Actions)
- **IaC**: OpenTofu (nicht Terraform/HashiCorp)
- **Region**: europe-west3
- **Domain**: gruppenstunde.de

## Requirements

### Requirement: Verbotene Technologien

Das System MUST folgende Technologien NICHT verwenden.

#### Scenario: Technologie-Ausschlüsse

- GIVEN die Architektur-Entscheidungen
- THEN gelten folgende Verbote:
  - Kein App Engine — Nicht verwenden, keine `app.yaml`-Dateien
  - Kein Docker lokal — Lokal immer `podman` statt `docker` verwenden
  - Keine GitHub Actions — CI/CD läuft über Google Cloud Build
  - Kein Terraform (HashiCorp) — Immer OpenTofu (`tofu`) verwenden

### Requirement: Ziel-Architektur

Das System SHALL folgende Cloud-Architektur verwenden.

#### Scenario: Architektur-Überblick

- **WHEN** die Ziel-Architektur betrachtet wird
- **THEN** besteht sie aus:
  - **GitHub** als Source Repository
  - **Artifact Registry** für Container-Images
- **Cloud Run Frontend** (`inspi-frontend`) — Nginx Reverse Proxy + Static Files auf Port 80
- **Cloud Run Backend** (`inspi-backend`) — Django/Gunicorn auf Port 8000
- **Cloud SQL** — Managed PostgreSQL, `db-f1-micro`, `PD_SSD`, Backups deaktiviert
- **GCS Media Bucket** — Benutzer-Uploads
- **Serverless VPC Access Connector** — Cloud Run → Cloud SQL Verbindung

### Requirement: Pre-Commit Hooks

Das System MUST Pre-Commit Hooks für Code-Qualität bereitstellen (bereits vorhanden in `.pre-commit-config.yaml`).

#### Scenario: Commit-Stage Hooks

- GIVEN ein Entwickler führt `git commit` aus
- THEN werden folgende Hooks ausgeführt:
  - trailing-whitespace, end-of-file-fixer (Basis-Formatierung)
  - check-yaml, check-toml, check-json (Config-Validierung)
  - check-added-large-files (max 500KB)
  - check-merge-conflict
  - debug-statements (keine `breakpoint()` / `pdb`)
  - ruff (lint + format)
  - black (Python Code Formatting)
  - mypy (Type Checking)

#### Scenario: Pre-Push Hooks

- GIVEN ein Entwickler führt `git push` aus
- THEN wird pytest mit `-m "not slow"` ausgeführt (schnelle Tests)

#### Scenario: Hook-Installation

- GIVEN ein neuer Entwickler
- WHEN er das Repository klont
- THEN installiert er die Hooks mit `make pre-commit-install`

### Requirement: Google Cloud Build CI/CD Pipeline

Das System MUST eine CI/CD-Pipeline über Google Cloud Build bereitstellen.

#### Scenario: PR-Check Pipeline (cloudbuild-pr.yaml)

- GIVEN ein Pull Request gegen den `main` Branch
- WHEN Cloud Build den PR-Trigger ausführt
- THEN werden folgende Schritte ausgeführt:
  1. **Lint & Format** (parallel): `ruff check`, `ruff format --check`, `black --check`
  2. **Type Check** (parallel zu Lint): `mypy .`
  3. **Tests** (nach Lint + Type Check): `pytest --tb=short -q`
- AND kein Deploy findet statt
- AND Timeout: 600 Sekunden

#### Scenario: Deploy Pipeline (cloudbuild.yaml)

- GIVEN ein Push auf den `main` Branch
- WHEN Cloud Build den Deploy-Trigger ausführt
- THEN werden folgende Schritte ausgeführt:
  1. **Build Backend Image** → `Dockerfile.backend`
  2. **Push Backend Image** → Artifact Registry
  3. **Build Frontend** (parallel): `npm ci && npm run build`
  4. **Deploy Backend** → Cloud Run (`inspi-backend`)
  5. **Deploy Frontend** → GCS rsync
- AND Timeout: 1200 Sekunden

#### Scenario: Cloud Build Vorteile

- GIVEN Cloud Build als CI/CD-Lösung
- THEN bietet es folgende Vorteile:
  - Keine Secrets nötig (nativer GCP Service Account)
  - Schnellere Builds (Images direkt in GCP gebaut)
  - Native Artifact Registry Integration
  - Direkte Cloud Run Deploys ohne externe Credentials
  - 120 Build-Minuten/Tag kostenlos

#### Scenario: Cloud Build Service Account Berechtigungen

- GIVEN der Cloud Build Service Account
- THEN benötigt er folgende IAM-Rollen:
  - `roles/run.admin` (Cloud Run Deployments)
  - `roles/iam.serviceAccountUser` (Service Account Impersonation)
  - `roles/storage.admin` (GCS Uploads)

### Requirement: Container-Builds mit Podman

Das System SHALL lokale Container-Builds mit Podman unterstützen.

#### Scenario: Lokale Entwicklung

- GIVEN ein Entwickler arbeitet lokal
- THEN startet er Dienste mit:
  - `podman compose up -d db` — PostgreSQL lokal
  - `make backend` — Django Dev Server
  - `make frontend` — Vite Dev Server

#### Scenario: Produktion Images lokal bauen

- GIVEN ein Entwickler will Produktion-Images testen
- THEN verwendet er:
  - `make build-backend` — `podman build -f Dockerfile.backend`
  - `make build-db` — `podman build -f Dockerfile.db`
  - `make push-backend` — `podman push` zu Artifact Registry
  - `make push-db` — `podman push` zu Artifact Registry

#### Scenario: Docker-Compose Kompatibilität

- GIVEN `docker-compose.yml` existiert im Projekt
- THEN versteht `podman compose` diese Datei
- AND lokal werden alle Container-Befehle mit `podman` ausgeführt
- AND in Cloud Build wird `gcr.io/cloud-builders/docker` verwendet (Docker in GCP ist OK)

### Requirement: Cloud Run Deployment

Das System SHALL die Cloud Run Service-Konfiguration definieren.

#### Scenario: Backend Service (inspi-backend)

- GIVEN der Backend Cloud Run Service
- THEN hat er folgende Konfiguration:
  - Image: `europe-west3-docker.pkg.dev/$PROJECT/inspi/backend:latest`
  - Port: 8000
  - CPU: 1, Memory: 512Mi
  - Min Instances: 0 (Scale to zero), Max: 10
  - Env Vars: `DJANGO_SETTINGS_MODULE=inspi.settings.production`
  - Allow unauthenticated: Ja (öffentliche API)

#### Scenario: Cloud SQL Database (inspi-db)

- GIVEN die Cloud SQL PostgreSQL Instanz
- THEN hat sie folgende kostenoptimierte Konfiguration:
  - Tier: `db-f1-micro` (günstigster Shared-Core)
  - Edition: `ENTERPRISE`
  - Disk: 10GB `PD_SSD`
  - Backups: **deaktiviert** (spart Backup-Speicherkosten)
  - Disk Auto-Resize: aus
  - Kein Point-in-Time Recovery

#### Scenario: Frontend (GCS Static Hosting)

- GIVEN das Frontend-Deployment
- THEN wird es wie folgt bereitgestellt:
  - Bucket: `gruppenstunde-static`
  - Build: `npm run build` → `gsutil rsync` zu GCS
  - Optional: Cloud CDN für bessere Performance

### Requirement: Datenbank-Kostenoptimierung

Das System SHALL die Cloud SQL Instanz kostenoptimiert betreiben.

#### Scenario: Aktuelle Cloud SQL Konfiguration

- GIVEN die Cloud SQL PostgreSQL Instanz
- THEN gilt folgende kostenoptimierte Konfiguration:
  - Tier: `db-f1-micro` (~$7,67/Monat Compute)
  - Disk: 10GB `PD_SSD` (~$0,40/Monat statt $1,70 mit SSD)
  - Backups: deaktiviert (spart ~$2-4/Monat)

#### Scenario: Kosten-Entscheidungen

- GIVEN die Kostenoptimierung
- THEN gelten folgende Entscheidungen:
  - **Keine Backups**: Datenbank ist nicht geschäftskritisch; Backups können manuell via `pg_dump` gemacht werden
  - **HDD statt SSD**: Bei geringem Datenvolumen (<10GB) ist der Performance-Unterschied vernachlässigbar
  - **`db-f1-micro`**: Günstigster verfügbarer Tier, ausreichend für die aktuelle Last
  - **Keine Migration zu Cloud Run PostgreSQL**: Bleibt vorerst bei Cloud SQL; Migration wäre bei Bedarf möglich

#### Scenario: Manuelles Backup

- GIVEN ein Administrator möchte ein Backup erstellen
- WHEN er ein manuelles Backup benötigt
- THEN führt er aus:
  - `pg_dump -h $DB_HOST -U inspi -d inspi > backup_$(date +%Y-%m-%d).sql`
  - AND lädt es z.B. in den Media Bucket hoch

### Requirement: Cloud SQL Google ML Integration Extension

Die Cloud SQL PostgreSQL Instanz SHALL die `google_ml_integration` Extension (v1.2+) installiert haben, um die native `embedding()`-SQL-Funktion bereitzustellen.

#### Scenario: Extension installieren
- **WHEN** die Django-Migration `google_ml_integration` ausführt
- **THEN** SHALL `CREATE EXTENSION IF NOT EXISTS google_ml_integration VERSION '1.2'` erfolgreich sein
- **THEN** SHALL die `embedding()`-Funktion in SQL verfügbar sein

#### Scenario: DB-User Berechtigung für embedding-Funktion
- **WHEN** die Migration die Berechtigung setzt
- **THEN** SHALL `GRANT EXECUTE ON FUNCTION embedding TO inspi` ausgeführt werden
- **THEN** SHALL der inspi-DB-User die `embedding()`-Funktion aufrufen können

### Requirement: Cloud SQL pgvector Extension

Die Cloud SQL PostgreSQL Instanz SHALL die `vector` Extension (pgvector) installiert haben, um `VectorField`, CosineDistance und HNSW-Indizes zu unterstützen.

#### Scenario: pgvector Extension verfügbar
- **WHEN** `CREATE EXTENSION IF NOT EXISTS vector` ausgeführt wird
- **THEN** SHALL die Extension erfolgreich installiert werden
- **THEN** SHALL `CosineDistance("embedding", query_vector)` in Django-ORM funktionieren
- **THEN** SHALL `USING hnsw (embedding vector_cosine_ops)` CREATE INDEX funktionieren

### Requirement: HNSW-Indizes ersetzen IVFFlat-Indizes

Das System SHALL die bestehenden IVFFlat-Indizes auf Embedding-Spalten droppen und durch HNSW-Indizes (Cosine Distance) ersetzen.

#### Scenario: IVFFlat-Indizes werden gedroppt
- **WHEN** die Index-Migration ausgeführt wird
- **THEN** SHALL `DROP INDEX IF EXISTS supply_ingredient_embedding_ivfflat` und `DROP INDEX IF EXISTS recipe_recipe_embedding_ivfflat` (plus blog, session, game IVFFlat-Indizes) ausgeführt werden

#### Scenario: Ingredient HNSW Index
- **WHEN** die Index-Migration ausgeführt wird
- **THEN** SHALL `CREATE INDEX CONCURRENTLY idx_ingredient_embedding_hnsw ON supply_ingredient USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)` erfolgreich sein

#### Scenario: Recipe HNSW Index
- **WHEN** die Index-Migration ausgeführt wird
- **THEN** SHALL `CREATE INDEX CONCURRENTLY idx_recipe_embedding_hnsw ON recipe_recipe USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)` erfolgreich sein

#### Scenario: Migration läuft außerhalb einer Transaktion
- **WHEN** die HNSW-Index-Migration definiert wird
- **THEN** SHALL die Migration-Klasse `atomic = False` haben (CONCURRENTLY nicht in Transaktionen möglich)

### Requirement: OpenTofu Infrastruktur-as-Code

Das System MUST alle GCP-Ressourcen über OpenTofu verwalten (nicht manuell per gcloud).

#### Scenario: Verzeichnisstruktur

- GIVEN das OpenTofu-Verzeichnis `terraform/`
- THEN enthält es:
  - `providers.tf` — OpenTofu + Google Provider, GCS Backend
  - `variables.tf` — Input-Variablen (project_id, region, etc.)
  - `main.tf` — Alle GCP-Ressourcen
  - `outputs.tf` — Backend-URL, DB-URL, Bucket-URLs
  - `.gitignore` — Schützt tfvars und State-Files
  - `env/prod.tfvars` — PROD-Werte (gitignored, enthält Secrets)
  - `env/prod.tfvars.example` — Vorlage

#### Scenario: Verwaltete Ressourcen

- GIVEN die OpenTofu-Konfiguration
- THEN verwaltet sie folgende GCP-Ressourcen:
  - GCP APIs (Cloud Build, Cloud Run, etc.) — `google_project_service`
  - Artifact Registry — `google_artifact_registry_repository`
  - GCS Frontend Bucket — `google_storage_bucket.frontend`
  - GCS Media Bucket — `google_storage_bucket.media`
  - Secret Manager (DB Password) — `google_secret_manager_secret`
  - Cloud SQL — `google_sql_database_instance.db`
  - Cloud Run Backend — `google_cloud_run_v2_service.backend`
  - Cloud Build IAM — `google_project_iam_member` (4 Rollen)
  - Cloud Build Triggers — `google_cloudbuild_trigger` (deploy + PR)
  - IAM Public Access — `google_cloud_run_v2_service_iam_member`

#### Scenario: Prod-Konfiguration

- GIVEN die Produktionskonfiguration
- THEN gelten folgende Werte:
  - Prefix: `inspi-*`
  - Branch: `main`
  - Domain: `gruppenstunde.de`
  - Backend Max Instances: 10
  - Backend Memory: 512Mi
  - DB Tier: `db-f1-micro`, Disk: 10GB `PD_SSD`, Backups: deaktiviert
  - PR Check Trigger: Ja

#### Scenario: OpenTofu Nutzung

- GIVEN ein Entwickler will die Infrastruktur deployen
- THEN führt er folgende Schritte aus:
  1. State Bucket erstellen (einmalig): `make tf-state-bucket`
  2. tfvars vorbereiten: `cp terraform/env/prod.tfvars.example terraform/env/prod.tfvars` und Werte ausfüllen
  3. Infrastruktur deployen: `make tf-init && make tf-plan && make tf-apply`

#### Scenario: OpenTofu Regeln

- GIVEN die OpenTofu-Nutzung
- THEN gelten folgende Regeln:
  - Alle GCP-Ressourcen werden über OpenTofu verwaltet, nicht manuell per `gcloud`
  - Secrets (db_password) kommen über `env/prod.tfvars` (gitignored)
  - State liegt in GCS Bucket `inspi-terraform-state` (versioniert)
  - Cloud Build GitHub-Verbindung muss manuell über Console erstellt werden (OAuth-Flow)
  - Danach wird der Repo-Name in `env/prod.tfvars` eingetragen
  - Immer `tofu` statt `terraform` verwenden. Installation: `brew install opentofu`

### Requirement: Implementierungs-Reihenfolge

Das System SHALL die Migration in folgender Reihenfolge durchführen.

#### Scenario: Phasen

- GIVEN der Migrationsplan
- THEN werden folgende Phasen durchlaufen:
  - **Phase 1**: Pre-Commit — Sicherstellen dass alle Devs es installiert haben
  - **Phase 2**: OpenTofu Setup — State Bucket, `env/prod.tfvars`
  - **Phase 3**: OpenTofu Apply (Basis) — APIs, Registry, Buckets, Secrets, Cloud Run
  - **Phase 4**: Cloud Build GitHub-Verbindung — Manuell über Console
  - **Phase 5**: OpenTofu Apply (Triggers) — Mit cloudbuild_repo gesetzt
  - **Phase 6**: Testen — Push auf main, Cloud Build deployt automatisch
  - **Phase 7**: App Engine Reste entfernen — app.yaml Referenzen und Code
  - **Phase 8**: Frontend CDN — Optional: Cloud CDN für bessere Performance
