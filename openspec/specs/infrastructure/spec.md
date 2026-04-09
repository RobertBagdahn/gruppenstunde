# infrastructure Specification

## Purpose

Infrastruktur, Deployment und CI/CD-Konfiguration für die Inspi-Plattform. Definiert die Ziel-Architektur (Google Cloud Run), Container-Builds (Podman), CI/CD-Pipeline (Google Cloud Build), Infrastruktur-as-Code (OpenTofu) und den Migrationsplan von App Engine/Cloud SQL.

## Context

- **Hosting**: Google Cloud Run (Migration von App Engine)
- **Datenbank**: Self-hosted PostgreSQL (pgvector) als Cloud Run Service
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

- GIVEN die Ziel-Architektur
- THEN besteht sie aus:
  - **GitHub** als Source Repository
  - **Google Cloud Build** für CI/CD (Trigger auf Push/PR)
  - **Artifact Registry** für Container-Images
  - **Cloud Run Backend** (`inspi-backend`) — Django/Gunicorn auf Port 8000
  - **Cloud Run DB** (`inspi-db`) — PostgreSQL + pgvector
  - **GCS Media Bucket** — Benutzer-Uploads
  - **GCS pgdata Volume** — PostgreSQL Datenpersistenz
  - **GCS Static Hosting** — Frontend (Vite Build Output)

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

#### Scenario: Database Service (inspi-db)

- GIVEN der Datenbank Cloud Run Service
- THEN hat er folgende Konfiguration:
  - Image: `europe-west3-docker.pkg.dev/$PROJECT/inspi/db:latest`
  - Port: 5432
  - CPU: 1, Memory: 1Gi
  - Min Instances: 1 (immer laufen), Max: 1
  - No CPU Throttling: Ja
  - Volume: Cloud Storage Bucket `inspi-pgdata-$PROJECT` gemountet auf `/var/lib/postgresql/data`
  - Allow unauthenticated: Nein (nur Backend darf zugreifen)

#### Scenario: Frontend (GCS Static Hosting)

- GIVEN das Frontend-Deployment
- THEN wird es wie folgt bereitgestellt:
  - Bucket: `gruppenstunde-static`
  - Build: `npm run build` → `gsutil rsync` zu GCS
  - Optional: Cloud CDN für bessere Performance

### Requirement: Datenbank-Migration (Cloud SQL zu Cloud Run PostgreSQL)

Das System SHALL einen klaren Migrationsplan für die Datenbank bereitstellen.

#### Scenario: Migrationsschritte

- GIVEN die Migration von Cloud SQL zu Cloud Run PostgreSQL
- THEN ist die Reihenfolge:
  1. Cloud Run PostgreSQL Service deployen (`make deploy-db`)
  2. Daten aus Cloud SQL exportieren (`pg_dump`)
  3. Daten in Cloud Run PostgreSQL importieren (`pg_restore`)
  4. Backend `production.py` Env-Vars auf Cloud Run DB Host umstellen
  5. Cloud SQL Instanz abschalten
  6. Cloud SQL Proxy aus dem Projekt entfernen

#### Scenario: Settings-Änderung (production.py)

- GIVEN die Datenbank-Konfiguration in `backend/inspi/settings/production.py`
- WHEN auf Cloud Run PostgreSQL umgestellt wird
- THEN ändern sich die Settings zu:
  - `ENGINE`: `django.db.backends.postgresql`
  - `NAME`: env `DB_NAME` (default: `inspi`)
  - `USER`: env `DB_USER` (default: `inspi`)
  - `PASSWORD`: env `DB_PASSWORD`
  - `HOST`: env `DB_HOST` (Cloud Run DB Service URL)
  - `PORT`: env `DB_PORT` (default: `5432`)

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
  - GCS pgdata Bucket — `google_storage_bucket.pgdata`
  - Secret Manager (DB Password) — `google_secret_manager_secret`
  - Cloud Run Backend — `google_cloud_run_v2_service.backend`
  - Cloud Run DB — `google_cloud_run_v2_service.db`
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
  - DB Memory: 1Gi
  - Min Instances: 0 (scale to zero — auch Datenbank)
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
  - **Phase 7**: Daten-Migration — Cloud SQL nach Cloud Run PostgreSQL
  - **Phase 8**: Cloud SQL abschalten — Instanz und Proxy entfernen
  - **Phase 9**: App Engine Reste entfernen — app.yaml Referenzen und Code
  - **Phase 10**: Frontend CDN — Optional: Cloud CDN für bessere Performance
