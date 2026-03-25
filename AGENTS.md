# AI Agent Configuration – Inspi (Gruppenstunde)

## Rolle

Du bist ein Full-Stack Entwickler für das Projekt **Inspi** – eine Pfadfinder-Gruppenstunden-Plattform. Du arbeitest in einem Monorepo mit Django Ninja Backend und React Frontend.

## ⚠️ WICHTIG: Keine Rückwärtskompatibilität nötig

Das Projekt befindet sich in aktiver Entwicklung. **Rückwärtskompatibilität ist nicht erforderlich.** Models, Schemas, APIs und Frontend-Komponenten dürfen jederzeit breaking geändert werden – ohne Migrations-Bridges, Deprecation-Phasen oder Fallbacks für alte Daten.

## ⚠️ WICHTIG: Rename – activity → idea

**Alle Referenzen auf "Activity", "Gruppenstunde" und "Heimabend" werden durch "Idea" ersetzt.** Das gilt für:
- Models, Schemas, API-Endpunkte, URLs, Dateinamen, Variablen, Komponenten, Stores, Hooks
- Siehe INSTRUCTIONS.md für die vollständige Mapping-Tabelle
- Beim Schreiben von Code **immer** "Idea" / "idea" verwenden

## ⚠️ WICHTIG: uv als Python Runner

**Alle Python/Django-Befehle MÜSSEN mit `uv run` ausgeführt werden**, z.B.:
- `uv run python manage.py makemigrations`
- `uv run python manage.py migrate`
- `uv run python manage.py createsuperuser`
- `uv run pytest`

Niemals `python` direkt aufrufen – immer `uv run python`.

## ⚠️ WICHTIG: AGENTS.md als Living Document

**Wenn während einer Copilot-Session neue Anforderungen, Konventionen, Architektur-Entscheidungen oder Projekt-Regeln entstehen, MÜSSEN diese in die passende `AGENTS.md` Datei eingetragen werden:**

| Scope | Datei | Inhalt |
|-------|-------|--------|
| **Projekt-übergreifend** | `AGENTS.md` (diese Datei) | Kernprinzipien, Sprache, Rename-Regeln, übergreifender Arbeitsablauf |
| **Backend** | `backend/AGENTS.md` | Models, API-Endpunkte, Pydantic Schemas, GCP, Django-Patterns |
| **Frontend** | `frontend/AGENTS.md` | Komponenten, Zod Schemas, UI-Design, TanStack Query, Pages |

- Neue API-Endpunkte oder Models → `backend/AGENTS.md`
- Neue UI-Patterns, Komponenten oder Design-Tokens → `frontend/AGENTS.md`
- Neue Technologie-Entscheidungen, Sprach-Regeln oder übergreifende Konventionen → diese Datei
- Neue Qualitätsregeln → die jeweils passende Checkliste (Backend / Frontend / hier)

**Ziel**: Die AGENTS.md-Dateien sind die zentrale Wissensquelle für alle AI Agents. Sie müssen immer den aktuellen Stand des Projekts widerspiegeln, damit zukünftige Sessions ohne Kontextverlust weiterarbeiten können.

## Kernprinzipien

1. **Schema-Sync zuerst**: Bei jeder API-Änderung IMMER Pydantic (Backend) UND Zod (Frontend) Schemas synchron halten
2. **Mobile-First**: Die App wird primär auf dem Smartphone bedient. Desktop/Laptop ist zweitrangig. Jede UI-Komponente muss auf Smartphones funktionieren (320px minimum).
3. **Type-Safety**: Keine `any` in TypeScript, Type Hints in Python, Zod-Validierung für alle API-Responses
4. **Performance**: Schnelle Ladezeiten haben höchste Priorität. Lazy Loading, optimierte Bilder, minimale Bundle-Größe, schnelle API-Responses (<200ms Suche). Lighthouse Performance-Score > 90 anstreben.
5. **URL-Driven State**: Möglichst viel Zustand über URLs und Query-Parameter abbilden (Filter, Suche, Paginierung, Ansichtsmodi). Damit sind Seiten teilbar, bookmarkbar und der Back-Button funktioniert korrekt.
6. **SEO**: Meta Tags, strukturierte Daten, semantisches HTML
7. **DSGVO**: Keine Klar-IPs speichern, gehashte Daten für Analytics
8. **Pagination als Standard**: Alle Tabellen und Listen (Frontend + Backend) MÜSSEN Pagination verwenden. Keine ungefilterten Komplett-Listen in der API. Standard: `page=1`, `page_size=20`. Paginated-Response-Format: `{ items, total, page, page_size, total_pages }`.

## Idea-Typen (IdeaType)

Eine Idea kann einen von drei Typen haben:

| Typ | Code | Beschreibung | Material | Inhaltslänge |
|-----|------|-------------|----------|--------------|
| **Klassische Idee** | `idea` | Gruppenstunden-Idee mit Anleitung und Materialiste | Ja (`MaterialItem`) | Normal |
| **Wissensbeitrag** | `knowledge` | Ausführlicher Wissensartikel, darf sehr lang sein | Nein (keine Materialliste) | Lang |
| **Rezept** | `recipe` | Koch-/Back-Anleitung zur Durchführung | Ja, als **Zutaten** (Material = Zutaten) | Normal |

### Regeln
- Das Feld `idea_type` bestimmt den Typ (TextChoices: `idea`, `knowledge`, `recipe`)
- **Wissensbeitrag**: `MaterialItem`-Zuordnung wird im UI ausgeblendet und in der API ignoriert
- **Rezept**: `MaterialItem` wird im UI als "Zutaten" (Label) angezeigt statt "Material"
- **Klassische Idee**: `MaterialItem` wird als "Material" angezeigt (Standard)
- Frontend und Backend müssen den Typ bei Erstellung, Bearbeitung, Suche und Anzeige berücksichtigen

## Arbeitsablauf

### Bei neuen Features (übergreifend)
1. Beginne mit dem Datenmodell (Django Model) → Details in `backend/AGENTS.md`
2. Erstelle Pydantic Schema + API-Endpunkt → `backend/AGENTS.md`
3. Erstelle Zod Schema (1:1 Match mit Pydantic) → `frontend/AGENTS.md`
4. Erstelle TanStack Query Hook → `frontend/AGENTS.md`
5. Baue UI-Komponente mit shadcn/ui → `frontend/AGENTS.md`
6. Teste Mobile und Desktop

### Backend-spezifisch → siehe `backend/AGENTS.md`
### Frontend-spezifisch → siehe `frontend/AGENTS.md`

## Sprache

- **Code**: Englisch (Variablen, Funktionen, Kommentare)
- **UI-Texte**: Deutsch (Labels, Buttons, Fehlermeldungen)
- **Commit Messages**: Englisch
- **Dokumentation**: Deutsch oder Englisch (konsistent bleiben)
- **Routing / URLs**: Immer Englisch. Keine deutschen Wörter in URL-Pfaden, weder im Backend noch im Frontend. Beispiel: `/profile/persons` statt `/profile/personen`.

## Authentifizierung (Session-basiert)

- **Architektur**: Django Allauth + Sessions (HTTP-only Cookies), kein JWT
- **Backend-Details** → `backend/AGENTS.md` (Auth-Pattern, Endpunkte)
- **Frontend-Details** → `frontend/AGENTS.md` (Auth-Flow, CSRF, Hooks)

## Qualitäts-Checkliste (vor jedem Commit)

- [ ] Pydantic und Zod Schemas sind synchron
- [ ] "Idea" verwendet, nicht "Activity", "Gruppenstunde" oder "Heimabend"
- [ ] Keine console.log / print Statements

### Backend-spezifisch → siehe `backend/AGENTS.md` (Qualitäts-Checkliste)
### Frontend-spezifisch → siehe `frontend/AGENTS.md` (Qualitäts-Checkliste)

## SEO & URL-Strategie

- **Backend** (Sitemap, Robots, Slug-API) → `backend/AGENTS.md`
- **Frontend** (Meta-Tags, URL-State, Routen) → `frontend/AGENTS.md`

## Design-Strategie & UI-Guidelines

→ Vollständige Details in `frontend/AGENTS.md` (Farbpalette, Icons, UI-Muster)

---

## ⚠️ WICHTIG: Infrastruktur & Deployment – Migration Plan

### Architektur-Entscheidungen

| Entscheidung | Alt (wird abgelöst) | Neu |
|---|---|---|
| **Hosting** | Google App Engine | **Google Cloud Run** |
| **Datenbank** | Cloud SQL (PostgreSQL) | **Self-hosted PostgreSQL (pgvector) als Cloud Run Service mit Cloud Storage Volume** |
| **Container Runtime** | Docker | **Podman** (lokal), **Cloud Build** (CI) |
| **CI/CD** | Manuell (Makefile) | **Google Cloud Build** (Trigger auf GitHub Push/PR) |
| **Code Quality** | Manuell | **Pre-Commit Hooks** (bereits vorhanden) + Cloud Build Checks |
| **Infrastruktur-as-Code** | Manuell (gcloud CLI) | **Terraform** (`terraform/`) |

### Verbotene Technologien

- ❌ **Kein App Engine** – Nicht verwenden, keine `app.yaml`-Dateien
- ❌ **Kein Cloud SQL** – Keine Cloud SQL Instanzen, keine Cloud SQL Proxy Verbindungen
- ❌ **Kein Docker lokal** – Lokal immer `podman` statt `docker` verwenden
- ❌ **Keine GitHub Actions** – CI/CD läuft über Google Cloud Build, nicht GitHub Actions

### Ziel-Architektur

```
┌──────────────────────────────────────────────────────────┐
│                  GitHub (Source)                          │
│  Push/PR ──────────────────────────┐                     │
└────────────────────────────────────┼─────────────────────┘
                                     ▼
┌──────────────────────────────────────────────────────────┐
│              Google Cloud Build                          │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────────┐  │
│  │ Lint/Test │  │ Build    │  │ Deploy to Cloud Run    │  │
│  │ (PR)     │  │ (Image)  │  │ (on push to main)     │  │
│  └──────────┘  └──────────┘  └────────────────────────┘  │
│                      │                                    │
│                      ▼                                    │
│            Artifact Registry                              │
└──────────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                 Google Cloud Run                          │
│                                                           │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐  │
│  │ inspi-backend│   │ inspi-db     │   │ Frontend     │  │
│  │ (Django/     │──▶│ (PostgreSQL  │   │ (GCS Static  │  │
│  │  Gunicorn)   │   │  + pgvector) │   │  Hosting)    │  │
│  └──────────────┘   └──────────────┘   └──────────────┘  │
│         │                  │                              │
│         ▼                  ▼                              │
│  ┌──────────────┐  ┌──────────────┐                      │
│  │ GCS Media    │  │ GCS Volume   │                      │
│  │ (Uploads)    │  │ (pg data)    │                      │
│  └──────────────┘  └──────────────┘                      │
└──────────────────────────────────────────────────────────┘
```

### 1. Pre-Commit Hooks (✅ bereits vorhanden)

Datei: `.pre-commit-config.yaml`

| Hook | Stage | Beschreibung |
|------|-------|-------------|
| trailing-whitespace, end-of-file-fixer | commit | Basis-Formatierung |
| check-yaml, check-toml, check-json | commit | Config-Validierung |
| check-added-large-files (max 500KB) | commit | Verhindert große Dateien |
| check-merge-conflict | commit | Merge-Konflikte erkennen |
| debug-statements | commit | Keine `breakpoint()` / `pdb` |
| ruff (lint + format) | commit | Python Linting & Formatting |
| black | commit | Python Code Formatting |
| mypy | commit | Type Checking |
| pytest (fast, `-m "not slow"`) | **pre-push** | Schnelle Tests vor Push |

**Installation:**
```bash
make pre-commit-install
```

### 2. Google Cloud Build CI/CD Pipeline

Dateien: `cloudbuild.yaml` (Deploy) + `cloudbuild-pr.yaml` (PR Checks)

#### Pipeline-Übersicht

```
GitHub Push/PR → Cloud Build Trigger → [Lint & Format] → [Type Check] → [Test] → [Build Image] → [Deploy]
                                                                                       │              │
                                                                                  nur main        nur main
```

#### Cloud Build Triggers einrichten

```bash
# 1. GitHub-Verbindung herstellen (einmalig)
gcloud builds connections create github inspi-github \
  --region=europe-west1

# 2. PR-Trigger (Lint + Test, kein Deploy)
gcloud builds triggers create github \
  --name=inspi-pr-check \
  --region=europe-west1 \
  --repository=projects/$PROJECT/locations/europe-west1/connections/inspi-github/repositories/inspi \
  --pull-request-pattern='^main$' \
  --build-config=cloudbuild-pr.yaml

# 3. Deploy-Trigger (Push auf main)
gcloud builds triggers create github \
  --name=inspi-deploy \
  --region=europe-west1 \
  --repository=projects/$PROJECT/locations/europe-west1/connections/inspi-github/repositories/inspi \
  --branch-pattern='^main$' \
  --build-config=cloudbuild.yaml
```

#### `cloudbuild-pr.yaml` (PR Checks – Lint, Type Check, Test)

```yaml
steps:
  # Lint & Format
  - name: 'python:3.13-slim'
    entrypoint: bash
    args:
      - -c
      - |
        pip install uv
        cd backend && uv sync
        uv run ruff check .
        uv run ruff format --check .
        uv run black --check .
    id: lint

  # Type Check
  - name: 'python:3.13-slim'
    entrypoint: bash
    args:
      - -c
      - |
        pip install uv
        cd backend && uv sync
        uv run mypy .
    id: typecheck
    waitFor: ['-']  # parallel zu lint

  # Tests
  - name: 'python:3.13-slim'
    entrypoint: bash
    args:
      - -c
      - |
        pip install uv
        cd backend && uv sync
        uv run pytest --tb=short -q
    id: test
    waitFor: ['lint', 'typecheck']
    env:
      - 'DB_HOST=localhost'
      - 'DB_NAME=inspi'
      - 'DB_USER=inspi'
      - 'DB_PASSWORD=inspi'

options:
  logging: CLOUD_LOGGING_ONLY
timeout: '600s'
```

#### `cloudbuild.yaml` (Deploy – Build + Push + Cloud Run)

```yaml
steps:
  # Build Backend Image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '${_REGION}-docker.pkg.dev/$PROJECT_ID/inspi/backend:$COMMIT_SHA', '-f', 'Dockerfile.backend', '.']
    id: build-backend

  # Push Backend Image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '${_REGION}-docker.pkg.dev/$PROJECT_ID/inspi/backend:$COMMIT_SHA']
    id: push-backend
    waitFor: ['build-backend']

  # Build Frontend
  - name: 'node:20'
    entrypoint: bash
    args:
      - -c
      - cd frontend && npm ci && npm run build
    id: build-frontend
    waitFor: ['-']

  # Deploy Backend to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - run
      - deploy
      - inspi-backend
      - --image=${_REGION}-docker.pkg.dev/$PROJECT_ID/inspi/backend:$COMMIT_SHA
      - --region=${_REGION}
      - --port=8000
      - --cpu=1
      - --memory=512Mi
      - --min-instances=0
      - --max-instances=10
      - --set-env-vars=DJANGO_SETTINGS_MODULE=inspi.settings.production
      - --allow-unauthenticated
    id: deploy-backend
    waitFor: ['push-backend']

  # Deploy Frontend to GCS
  - name: 'gcr.io/cloud-builders/gsutil'
    args: ['-m', 'rsync', '-r', 'frontend/dist/', 'gs://gruppenstunde-static/']
    id: deploy-frontend
    waitFor: ['build-frontend']

substitutions:
  _REGION: europe-west1

images:
  - '${_REGION}-docker.pkg.dev/$PROJECT_ID/inspi/backend:$COMMIT_SHA'

options:
  logging: CLOUD_LOGGING_ONLY
timeout: '1200s'
```

#### Vorteile Cloud Build vs. GitHub Actions

- **Keine Secrets nötig** – Cloud Build läuft nativ in GCP mit Service Account
- **Schnellere Builds** – Images werden direkt in GCP gebaut, kein Upload nötig
- **Artifact Registry Integration** – Native Push ohne extra Auth
- **Cloud Run Deploy** – Direkt aus Cloud Build, keine externen Credentials
- **Kosten** – 120 Build-Minuten/Tag kostenlos

#### Cloud Build Service Account Berechtigungen

```bash
# Cloud Build SA braucht folgende Rollen:
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/run.admin

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/iam.serviceAccountUser

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member=serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com \
  --role=roles/storage.admin
```

### 3. Container-Builds mit Podman

#### Lokale Entwicklung
```bash
podman compose up -d db          # PostgreSQL lokal starten
make backend                     # Django Dev Server
make frontend                    # Vite Dev Server
```

#### Produktion Images bauen
```bash
make build-backend               # podman build -f Dockerfile.backend
make build-db                    # podman build -f Dockerfile.db
make push-backend                # podman push → Artifact Registry
make push-db                     # podman push → Artifact Registry
```

**Regeln:**
- Lokal: Alle Container-Befehle verwenden `podman`, niemals `docker`
- CI (Cloud Build): Verwendet `gcr.io/cloud-builders/docker` Builder (Docker in GCP ist OK)
- `docker-compose.yml` bleibt kompatibel, da `podman compose` es versteht

### 4. Cloud Run Deployment (Ziel-Setup)

#### Backend Service (`inspi-backend`)
- **Image**: `europe-west1-docker.pkg.dev/$PROJECT/inspi/backend:latest`
- **Port**: 8000
- **CPU**: 1, **Memory**: 512Mi
- **Min Instances**: 0 (Scale to zero), **Max**: 10
- **Env Vars**: `DJANGO_SETTINGS_MODULE=inspi.settings.production`
- **Allow unauthenticated**: Ja (öffentliche API)

#### Database Service (`inspi-db`)
- **Image**: `europe-west1-docker.pkg.dev/$PROJECT/inspi/db:latest`
- **Port**: 5432
- **CPU**: 1, **Memory**: 1Gi
- **Min Instances**: 1 (immer laufen!), **Max**: 1
- **No CPU Throttling**: Ja
- **Volume**: Cloud Storage Bucket `inspi-pgdata-$PROJECT` gemountet auf `/var/lib/postgresql/data`
- **Allow unauthenticated**: Nein (nur Backend darf zugreifen)

#### Frontend (GCS Static Hosting)
- **Bucket**: `gruppenstunde-static`
- **Build**: `npm run build` → `gsutil rsync` zu GCS
- Optional: Cloud CDN davor für Performance

### 5. Datenbank-Migration (Cloud SQL → Cloud Run PostgreSQL)

**Reihenfolge:**
1. Cloud Run PostgreSQL Service deployen (`make deploy-db`)
2. Daten aus Cloud SQL exportieren (`pg_dump`)
3. Daten in Cloud Run PostgreSQL importieren (`pg_restore`)
4. Backend `production.py` Env-Vars auf Cloud Run DB Host umstellen
5. Cloud SQL Instanz abschalten
6. Cloud SQL Proxy aus dem Projekt entfernen

**Settings ändern** in `backend/inspi/settings/production.py`:
```python
# Vorher (Cloud SQL):
# "HOST": env("DB_HOST", default="/cloudsql/PROJECT_ID:REGION:INSTANCE")

# Nachher (Cloud Run PostgreSQL):
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", default="inspi"),
        "USER": env("DB_USER", default="inspi"),
        "PASSWORD": env("DB_PASSWORD", default=""),
        "HOST": env("DB_HOST"),  # Cloud Run DB Service URL
        "PORT": env("DB_PORT", default="5432"),
    }
}
```

### 6. Terraform – Infrastruktur-as-Code

Verzeichnis: `terraform/`

```
terraform/
  providers.tf              ← Terraform + Google Provider, GCS Backend (per-env prefix)
  variables.tf              ← Input-Variablen (project_id, region, environment, etc.)
  main.tf                   ← Alle GCP-Ressourcen (env-aware via var.environment)
  outputs.tf                ← Backend-URL, DB-URL, Bucket-URLs, Environment
  terraform.tfvars.example  ← Referenz (nicht direkt nutzen)
  .gitignore                ← Schützt tfvars und State-Files
  env/
    dev.tfvars.example      ← DEV-Werte (kopieren → dev.tfvars, ausfüllen)
    prod.tfvars.example     ← PROD-Werte (kopieren → prod.tfvars, ausfüllen)
```

#### Environments (dev / prod)

| Aspekt | dev | prod |
|---|---|---|
| **Prefix** | `inspi-dev-*` | `inspi-*` |
| **Branch** | `develop` | `main` |
| **Domain** | `dev.gruppenstunde.de` | `gruppenstunde.de` |
| **Backend Max Instances** | 2 | 10 |
| **Backend Memory** | 256Mi | 512Mi |
| **DB Memory** | 512Mi | 1Gi |
| **DB Min Instances** | 0 (scale to zero) | 0 (scale to zero) |
| **PR Check Trigger** | Nein | Ja |
| **State Prefix** | `terraform/dev` | `terraform/prod` |

Alle Cloud Run Services skalieren auf **0 Minimum-Instanzen** (scale to zero) – auch die Datenbank. Das spart Kosten, bedeutet aber Cold-Start-Zeiten.

#### Verwaltete Ressourcen

| Ressource | Terraform Resource |
|---|---|
| GCP APIs (Cloud Build, Cloud Run, etc.) | `google_project_service` |
| Artifact Registry | `google_artifact_registry_repository` |
| GCS Frontend Bucket | `google_storage_bucket.frontend` |
| GCS Media Bucket | `google_storage_bucket.media` |
| GCS pgdata Bucket | `google_storage_bucket.pgdata` |
| Secret Manager (DB Password) | `google_secret_manager_secret` |
| Cloud Run Backend | `google_cloud_run_v2_service.backend` |
| Cloud Run DB | `google_cloud_run_v2_service.db` |
| Cloud Build IAM | `google_project_iam_member` (4 Rollen) |
| Cloud Build Triggers | `google_cloudbuild_trigger` (deploy + PR) |
| IAM Public Access | `google_cloud_run_v2_service_iam_member` |

#### Nutzung

```bash
# 1. State Bucket erstellen (einmalig)
make tf-state-bucket

# 2. Environment-Variablen vorbereiten
cp terraform/env/dev.tfvars.example terraform/env/dev.tfvars
cp terraform/env/prod.tfvars.example terraform/env/prod.tfvars
# → Werte ausfüllen (project_id, db_password, cloudbuild_repo)

# 3. DEV deployen
make tf-init ENV=dev
make tf-plan ENV=dev
make tf-apply ENV=dev

# 4. PROD deployen
make tf-init ENV=prod
make tf-plan ENV=prod
make tf-apply ENV=prod
```

#### Regeln
- **Alle GCP-Ressourcen** werden über Terraform verwaltet, nicht manuell per `gcloud`
- **Separate State-Files** pro Environment (dev/prod) im selben GCS Bucket
- **Secrets** (db_password) kommen über `env/dev.tfvars` / `env/prod.tfvars` (gitignored!)
- **State** liegt in GCS Bucket `inspi-terraform-state` (versioniert)
- **Cloud Build GitHub-Verbindung** muss manuell über Console erstellt werden (OAuth-Flow), danach wird der Repo-Name in den tfvars eingetragen
- **Cloud Build Trigger** wird von Terraform erstellt und setzt die Substitutions (`_ENVIRONMENT`, `_BACKEND_SERVICE`, `_FRONTEND_BUCKET`) automatisch

### 7. Implementierungs-Reihenfolge

- [ ] **Phase 1: Pre-Commit** – Bereits vorhanden, nur sicherstellen dass alle Devs es installiert haben (`make pre-commit-install`)
- [ ] **Phase 2: Terraform Setup** – State Bucket erstellen, env/*.tfvars anlegen
- [ ] **Phase 3: Terraform DEV** – `make tf-init ENV=dev && make tf-apply ENV=dev` (APIs, Registry, Buckets, Secrets, Cloud Run)
- [ ] **Phase 4: Cloud Build GitHub-Verbindung** – Manuell über Console, Repo-Name in env/*.tfvars eintragen
- [ ] **Phase 5: Terraform mit Triggers** – `make tf-apply ENV=dev` erneut (jetzt mit cloudbuild_repo gesetzt)
- [ ] **Phase 6: DEV testen** – Push auf `develop` Branch → Cloud Build deployt automatisch
- [ ] **Phase 7: Terraform PROD** – `make tf-init ENV=prod && make tf-apply ENV=prod`
- [ ] **Phase 8: Daten-Migration** – Daten von Cloud SQL nach Cloud Run PostgreSQL migrieren
- [ ] **Phase 9: Cloud SQL abschalten** – Cloud SQL Instanz und Proxy entfernen, `production.py` bereinigen
- [ ] **Phase 10: App Engine Reste entfernen** – Alle `app.yaml` Referenzen und App-Engine-spezifischen Code entfernen
- [ ] **Phase 11: Frontend CDN** – Optional: Cloud CDN vor GCS für bessere Performance
