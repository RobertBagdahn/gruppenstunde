---
name: deploy
description: Interactive deployment skill for Inspi. Checks infrastructure, builds and deploys backend and frontend step by step. Asks before each action.
license: MIT
metadata:
  author: inspi
  version: "2.0"
---

# Skill: Deploy

Interactive, step-by-step deployment for the Inspi platform to Google Cloud Run. Checks every prerequisite, shows output, and asks before proceeding.

**IMPORTANT: This skill NEVER overwrites existing data. It only deploys new container revisions.**

---

## Constants

| Key | Value |
|-----|-------|
| Project ID | `inspi-441320` |
| Region | `europe-west3` |
| Artifact Registry | `europe-west3-docker.pkg.dev/inspi-441320/inspi` |
| Backend Image | `europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest` |
| Frontend Image | `europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend:latest` |
| Frontend Food Image | `europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest` |
| Cloud SQL Instance | `inspi-db` |
| Cloud SQL Connection | `inspi-441320:europe-west3:inspi-db` |
| Backend Service | `inspi-backend` |
| Backend URL | `https://inspi-backend-148679246533.europe-west3.run.app` |
| Frontend Service | `inspi-frontend` |
| Frontend Food Service | `inspi-frontend-food` |

---

## Critical Learnings

### ARM Mac: Use Cloud Build, NOT local podman/docker

Local builds on ARM Macs produce ARM images that won't run on Cloud Run (amd64). **Always use Cloud Build** for container images:

```bash
gcloud builds submit --config /dev/stdin --region europe-west3 --timeout=600 . <<'EOF'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '<IMAGE_TAG>', '-f', '<DOCKERFILE>', '--build-arg', 'KEY=VALUE', '.']
images:
  - '<IMAGE_TAG>'
EOF
```

### Frontend: NO nginx proxy — direct CORS

Frontends call the backend directly via CORS (no nginx reverse proxy). The `VITE_API_URL` is baked in at build time:

- `Dockerfile.frontend` and `Dockerfile.frontend-food` accept `--build-arg VITE_API_URL=...`
- Frontend code uses `API_BASE_URL` from `@/lib/api` which reads `import.meta.env.VITE_API_URL`
- Backend has CORS enabled for frontend origins in `inspi/settings/production.py`
- nginx serves only static files + SPA fallback (no proxy_pass, no envsubst, no resolver)

**Why no proxy:** nginx DNS resolution inside Cloud Run adds 3-5s latency per request. Direct CORS calls are ~0.4s.

### .gcloudignore

The `.gcloudignore` must NOT exclude `frontend/` or `frontend-food/` directories (needed for frontend builds). Current config:

```
__pycache__/
.venv/
venv/
node_modules/
# frontend/ — needed for frontend builds
.git/
.gitignore
*.md
*.ipynb
.env*
docker-compose.yml
```

### DB Password via Secret Manager

Use `--set-secrets` instead of plain env vars for the DB password:

```bash
gcloud run deploy inspi-backend \
  --set-secrets "DB_PASSWORD=prod_db_password:latest"
```

### Untracked files in Cloud Build

`gcloud builds submit` uploads based on `.gcloudignore`, NOT git tracking. However, files must exist locally. If a build fails with "file not found", ensure the file exists and is not in `.gcloudignore`.

---

## Workflow

Execute these phases **sequentially**. After each phase, show the result and ask the user whether to continue.

### Phase 1: Pre-Flight Checks

Run each check and report status. If any check fails, ask what to do.

```bash
# 1.1 Auth check
gcloud auth list --filter=status:ACTIVE --format="value(account)"

# 1.2 Project check
gcloud config get-value project

# 1.3 Artifact Registry exists?
gcloud artifacts repositories describe inspi --location=europe-west3 --format="value(name)"

# 1.4 Cloud SQL instance exists and running?
gcloud sql instances describe inspi-db --format="value(state)"

# 1.5 Cloud Run services exist?
gcloud run services list --region=europe-west3 --format="table(SERVICE,REGION,URL,LAST_DEPLOYED)"
```

Present results as a checklist:
```
Pre-Flight Results:
[x] gcloud authenticated as: <email>
[x] Project: inspi-441320
[x] Artifact Registry: inspi (europe-west3)
[x] Cloud SQL: inspi-db (RUNNABLE)
[x] Cloud Run services: inspi-backend, inspi-frontend, inspi-frontend-food
```

If project is not `inspi-441320`, **ask the user** before continuing.

### Phase 2: Database Check

```bash
# 2.1 Check Cloud SQL connectivity
gcloud sql instances describe inspi-db --format="value(ipAddresses[0].ipAddress)"

# 2.2 Check backend API is reachable
BACKEND_URL=$(gcloud run services describe inspi-backend --region=europe-west3 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/docs"
```

Expected: HTTP 200. If not, the backend may need redeployment.

### Phase 3: Deploy Backend

Ask: "Backend deployen? (build + push + deploy)" — proceed only on confirmation.

```bash
# 3.1 Build via Cloud Build (NEVER local podman on ARM Mac)
gcloud builds submit --config /dev/stdin --region europe-west3 --timeout=600 . <<'EOF'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest', '-f', 'Dockerfile.backend', '.']
images:
  - 'europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest'
EOF

# 3.2 Deploy
DB_HOST=$(gcloud sql instances describe inspi-db --format="value(ipAddresses[0].ipAddress)")
gcloud run deploy inspi-backend \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest \
  --region europe-west3 \
  --port 8000 \
  --cpu 1 --memory 512Mi \
  --min-instances 0 --max-instances 10 \
  --set-env-vars "DJANGO_SETTINGS_MODULE=inspi.settings.production,DB_HOST=${DB_HOST},DB_NAME=inspi,DB_USER=inspi,DB_PORT=5432" \
  --set-secrets "DB_PASSWORD=prod_db_password:latest" \
  --allow-unauthenticated

# 3.3 Verify
BACKEND_URL=$(gcloud run services describe inspi-backend --region=europe-west3 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/docs"
```

Expected: HTTP 200. If not, show error and ask.

### Phase 4: Run Migrations

Ask: "Django Migrations auf dem Backend ausführen?"

**Option A: Via Cloud SQL Proxy (local)**

```bash
# Start proxy if not running
cloud-sql-proxy inspi-441320:europe-west3:inspi-db --port 5433 &

# Run migrations
DATABASE_URL="postgres://inspi:<PASSWORD>@localhost:5433/inspi" uv run python manage.py migrate --noinput
```

**Option B: Via Cloud Run Jobs**

```bash
gcloud run jobs execute inspi-migrate --region europe-west3 --wait
```

### Phase 5: Deploy Frontend

Ask: "Frontend deployen? (build + push + deploy)" — proceed only on confirmation.

```bash
# 5.1 Build via Cloud Build with VITE_API_URL baked in
BACKEND_URL=$(gcloud run services describe inspi-backend --region=europe-west3 --format="value(status.url)")

gcloud builds submit --config /dev/stdin --region europe-west3 --timeout=600 . <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend:latest', '-f', 'Dockerfile.frontend', '--build-arg', 'VITE_API_URL=${BACKEND_URL}', '.']
images:
  - 'europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend:latest'
EOF

# 5.2 Deploy (NO env vars needed — API URL is baked into JS bundle)
gcloud run deploy inspi-frontend \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend:latest \
  --region europe-west3 \
  --port 80 \
  --cpu 1 --memory 256Mi \
  --min-instances 0 --max-instances 5 \
  --allow-unauthenticated

# 5.3 Verify
FRONTEND_URL=$(gcloud run services describe inspi-frontend --region=europe-west3 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/"
```

Expected: HTTP 200.

### Phase 6: Deploy Frontend Food

Ask: "Food Frontend deployen? (build + push + deploy)" — proceed only on confirmation.

```bash
# 6.1 Build via Cloud Build with VITE_API_URL baked in
BACKEND_URL=$(gcloud run services describe inspi-backend --region=europe-west3 --format="value(status.url)")

gcloud builds submit --config /dev/stdin --region europe-west3 --timeout=600 . <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest', '-f', 'Dockerfile.frontend-food', '--build-arg', 'VITE_API_URL=${BACKEND_URL}', '.']
images:
  - 'europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest'
EOF

# 6.2 Deploy (NO env vars needed)
gcloud run deploy inspi-frontend-food \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest \
  --region europe-west3 \
  --port 80 \
  --cpu 1 --memory 256Mi \
  --min-instances 0 --max-instances 5 \
  --allow-unauthenticated

# 6.3 Verify
FRONTEND_FOOD_URL=$(gcloud run services describe inspi-frontend-food --region=europe-west3 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_FOOD_URL}/"
```

Expected: HTTP 200.

### Phase 7: Create Users

Ask: "Sollen Benutzer angelegt werden?"

Uses the `add_users` management command to create initial users. Requires Cloud SQL Proxy or a Cloud Run Job.

```bash
# Via Cloud SQL Proxy (local)
DATABASE_URL="postgres://inspi:<PASSWORD>@localhost:5433/inspi" uv run python manage.py add_users
```

The `add_users` command creates:
- Superuser (admin)
- Test users for development

### Phase 8: Post-Deploy Summary

```bash
gcloud run services list --region=europe-west3 --format="table(SERVICE,URL,LAST_DEPLOYED_BY,LAST_DEPLOYED)"
```

Show final summary:
```
Deployment Complete:
  Backend:       <url> (HTTP <status>)
  Frontend:      <url> (HTTP <status>)
  Frontend Food: <url> (HTTP <status>)
  DB:            inspi-db (<state>)
```

---

## Guardrails

- **NEVER** delete or overwrite data
- **NEVER** drop databases or run destructive migrations
- **NEVER** proceed without user confirmation at each major step
- **NEVER** use local podman/docker build on ARM Mac — always Cloud Build
- **ALWAYS** show command output before asking to continue
- **ALWAYS** use `--set-secrets` for DB_PASSWORD (never plain env var)
- If a command fails, show the error and ask what to do — don't retry automatically
- If the user says "skip", move to the next phase

---

## Partial Deploys

The user can request partial deploys:
- "nur backend" → Only Phase 3
- "nur frontend" → Only Phase 5+6
- "nur checks" → Only Phase 1+2
- "nur migrations" → Only Phase 4
- "nur users" → Only Phase 7

Adapt accordingly.
