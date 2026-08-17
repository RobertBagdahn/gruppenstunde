## Context

Aktuell deployt das Projekt das Backend als Cloud Run Service, die DB als self-hosted PostgreSQL Container in Cloud Run (mit GCS-Volume), und das Frontend als statische Dateien nach GCS. Cloud Build und OpenTofu sind konfiguriert aber nicht produktiv aktiv.

Ziel ist ein vereinfachtes Setup: Zwei unabhängige Cloud Run Services (Frontend + Backend), Cloud SQL als managed DB, alles manuell deploybar über Makefile + Podman + gcloud.

## Goals / Non-Goals

**Goals:**
- Frontend als eigener Cloud Run Service (Nginx-Container mit Reverse Proxy zu Backend)
- Backend als Cloud Run Service mit Cloud SQL Verbindung über Private IP
- Cloud SQL als managed PostgreSQL (kein pgvector vorerst)
- Einmaliges Infra-Setup per Makefile (`make setup-infra`)
- Wiederholbares Deployment per `make deploy`
- Session-Auth funktioniert ohne CORS-Probleme (same-origin via Nginx Proxy)

**Non-Goals:**
- CI/CD (Cloud Build) — kommt später
- Infrastructure-as-Code (OpenTofu) — kommt später
- Custom Domain / SSL — erstmal default *.run.app URLs
- pgvector Extension — erstmal ohne
- Daten-Migration von bestehender DB

## Decisions

### 1. Frontend: Nginx Reverse Proxy statt separater Origin

**Entscheidung**: Nginx im Frontend-Container leitet `/api/*` an die Backend Cloud Run URL weiter.

**Warum**: Das Frontend nutzt überall relative Pfade (`/api/...`) mit `credentials: 'include'`. Cross-origin Session-Cookies erfordern `SameSite=None` + CORS-Config — fehleranfällig. Mit Nginx-Proxy bleibt alles same-origin, kein Code-Change nötig.

**Alternative verworfen**: Absolute URLs im Frontend + CORS. Hätte ~200 fetch()-Aufrufe geändert und Cookie-Probleme verursacht.

### 2. Nginx ENV-Injection via envsubst

**Entscheidung**: `docker-entrypoint.sh` ersetzt `$BACKEND_URL` in `nginx.conf.template` per `envsubst` beim Container-Start.

**Warum**: Nginx kann keine Env-Vars nativ. envsubst ist der Standard-Ansatz für Container. Die Backend-URL ist erst nach dem Backend-Deploy bekannt.

**Dateien:**
- `Dockerfile.frontend` (neu)
- `nginx.conf.template` (neu)
- `docker-entrypoint.sh` (neu)

### 3. Cloud SQL mit Private IP + VPC Connector

**Entscheidung**: Cloud Run Backend verbindet sich über einen Serverless VPC Access Connector mit der Private IP der Cloud SQL Instanz.

**Warum**: Private IP ist sicherer als Public IP. Cloud Run unterstützt VPC Connector nativ via `--vpc-connector` Flag.

**Setup-Schritte** (einmalig, im Makefile):
1. VPC Connector erstellen (`gcloud compute networks vpc-access connectors create`)
2. Cloud SQL Instanz erstellen (`gcloud sql instances create`)
3. DB + User erstellen (`gcloud sql databases create`, `gcloud sql users create`)

### 4. Deploy-Reihenfolge: Backend zuerst

**Entscheidung**: `make deploy` deployt Backend zuerst, dann Frontend (das die Backend-URL als ENV braucht).

**Warum**: Die Frontend-URL des Backends wird automatisch per `gcloud run services describe` abgefragt und als `BACKEND_URL` in den Frontend-Deploy injiziert.

### 5. Dockerfile.db wird gelöscht

**Entscheidung**: Cloud SQL ersetzt den self-hosted PostgreSQL Container vollständig.

**Warum**: Managed DB = kein eigener Container, automatische Backups, Patching, HA optional. GCS-Volume-Hack für Persistenz entfällt.

## Risks / Trade-offs

- **[VPC Connector Kosten]** → Minimal (~$0.01/h für e2-micro). Für Dev-Workloads vernachlässigbar.
- **[Cold Start Frontend]** → Nginx-Container startet in <1s. Kein Problem.
- **[Backend-URL ändert sich nach Redeploy]** → Cloud Run URLs sind stabil (ändern sich nicht nach Service-Erstellung). Nur beim ersten Deploy muss Frontend danach redeployt werden.
- **[Kein pgvector]** → Embedding-basierte Suche funktioniert vorerst nicht in Produktion. Akzeptabel für initialen Deploy.
- **[production.py ALLOWED_HOSTS]** → Muss *.run.app Domain dynamisch unterstützen. Lösung: `ALLOWED_HOSTS = ["*"]` initial oder ENV-basiert.

## Migration Plan

1. `make setup-infra` — VPC Connector + Cloud SQL + Artifact Registry
2. `make deploy-backend` — Backend deployen, URL merken
3. `make deploy-frontend` — Frontend deployen mit Backend-URL
4. Manuell: `production.py` ENV-Vars in Cloud Run setzen (DB_HOST, DB_PASSWORD etc.)
5. Manuell: `gcloud run services update inspi-backend --set-env-vars ...` für DB-Credentials

Rollback: Cloud Run revisions bleiben erhalten. `gcloud run services update-traffic` auf vorherige Revision.
