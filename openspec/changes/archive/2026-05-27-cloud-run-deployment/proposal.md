## Why

Das aktuelle Deployment-Setup ist inkonsistent: Frontend geht nach GCS, DB läuft als self-hosted Container in Cloud Run mit GCS-Volume, und es gibt eine Abhängigkeit von Cloud Build und OpenTofu die noch nicht produktiv laufen. Wir brauchen einen einfachen, manuellen Deployment-Weg der sofort funktioniert: zwei Cloud Run Services (Frontend + Backend), Cloud SQL als managed DB, alles deploybar über `make deploy`.

## What Changes

- **NEU**: `Dockerfile.frontend` — Multi-stage Build (Node → Nginx) mit envsubst für Backend-URL-Proxy
- **NEU**: Makefile-Targets für Cloud SQL Setup, VPC Connector, und Frontend-Deployment
- **BREAKING**: `Dockerfile.db` wird gelöscht (Cloud SQL ersetzt self-hosted PostgreSQL)
- **BREAKING**: Makefile-Targets `deploy-db`, `push-db`, `build-db` werden entfernt
- **BREAKING**: Cloud Build und OpenTofu Targets werden aus dem Makefile entfernt (vorerst)
- **Anpassung**: `deploy-backend` Target nutzt Cloud SQL Private IP + VPC Connector
- **Anpassung**: `deploy-frontend` Target deployt Nginx-Container statt GCS rsync
- **Anpassung**: `backend/inspi/settings/production.py` DB-Config für Cloud SQL

## Capabilities

### New Capabilities

- `cloud-run-deploy`: Makefile-basiertes Deployment von Frontend und Backend als separate Cloud Run Services mit Cloud SQL, ohne CI/CD-Abhängigkeit

### Modified Capabilities

- `infrastructure`: DB wechselt von self-hosted Cloud Run PostgreSQL zu Cloud SQL; Frontend von GCS Static zu Cloud Run Nginx Container; Cloud Build und OpenTofu werden vorerst entfernt

## Impact

- **Dateien gelöscht**: `Dockerfile.db`
- **Dateien neu**: `Dockerfile.frontend`, `nginx.conf` (oder inline), `docker-entrypoint.sh` für Frontend
- **Dateien geändert**: `Makefile`, `backend/inspi/settings/production.py`, `docker-compose.yml` (optional cleanup)
- **Infra**: Cloud SQL Instanz + VPC Connector müssen in GCP existieren (werden per Makefile angelegt)
- **Keine Schema-Änderungen**: Keine Pydantic/Zod-Änderungen, keine Migrations
