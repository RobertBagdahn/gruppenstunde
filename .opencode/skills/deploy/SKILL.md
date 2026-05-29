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

Local builds on ARM Macs produce ARM images that won't run on Cloud Run (amd64). **Always use Cloud Build** for container images.

**IMPORTANT:** `gcloud builds submit --config /dev/stdin` does NOT work reliably. Write a temporary YAML file instead:

```bash
# Write cloudbuild config to temp file
cat > /tmp/cloudbuild.yaml <<'EOF'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', '<IMAGE_TAG>', '-f', '<DOCKERFILE>', '--build-arg', 'KEY=VALUE', '.']
images:
  - '<IMAGE_TAG>'
EOF

gcloud builds submit --config=/tmp/cloudbuild.yaml --region=europe-west3 .
```

### Deploy: Minimal flags — preserve existing config

When deploying a new image to an existing service, use **only `--image` and `--region`**. Cloud Run preserves all existing env vars, secrets, CPU/memory, and scaling settings:

```bash
gcloud run deploy inspi-backend \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest \
  --region europe-west3
```

Only add explicit flags when you need to **change** configuration. Using all flags risks overwriting secrets or env vars.

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

### GOOGLE_CLOUD_PROJECT must be set

The backend needs `GOOGLE_CLOUD_PROJECT=inspi-441320` as an env var on Cloud Run. Without it, the Gemini/Vertex AI client cannot initialize and all AI features (quantity estimation, text improvement, tag suggestions) return 500 errors. This var is set via Terraform and preserved by minimal deploys, but if the service is recreated or env vars are reset, it must be re-added explicitly.

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

```bash
# 2.3 Seed check: verify data exists
curl -s "${BACKEND_URL}/api/sessions/?page_size=1" | python3 -c "
import sys, json
data = json.load(sys.stdin)
total = data.get('total', 0)
print(f'Sessions in DB: {total}')
if total == 0:
    print('WARNING: No sessions found. Seeds may not be loaded.')
    sys.exit(1)
"
```

If seeds are missing, ask: "Keine Daten gefunden. Soll ich Seeds laden? (erfordert Cloud SQL Proxy oder Cloud Run Job)"

### Phase 3: Deploy Backend

Ask: "Backend deployen? (build + push + deploy)" — proceed only on confirmation.

```bash
# 3.1 Build via Cloud Build (NEVER local podman on ARM Mac)
cat > /tmp/cloudbuild-backend.yaml <<'EOF'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest', '-f', 'Dockerfile.backend', '.']
images:
  - 'europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest'
EOF
gcloud builds submit --config=/tmp/cloudbuild-backend.yaml --region=europe-west3 .

# 3.2 Deploy (minimal flags — preserves existing env/secrets/scaling)
gcloud run deploy inspi-backend \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest \
  --region europe-west3

# 3.3 Verify
BACKEND_URL=$(gcloud run services describe inspi-backend --region=europe-west3 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/docs"
```

**First-time setup only** (when service config needs to be set):
```bash
DB_HOST=$(gcloud sql instances describe inspi-db --format="value(ipAddresses[0].ipAddress)")
gcloud run deploy inspi-backend \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest \
  --region europe-west3 \
  --port 8000 \
  --cpu 1 --memory 512Mi \
  --min-instances 0 --max-instances 10 \
  --set-env-vars "DJANGO_SETTINGS_MODULE=inspi.settings.production,GOOGLE_CLOUD_PROJECT=inspi-441320,DB_HOST=${DB_HOST},DB_NAME=inspi,DB_USER=inspi,DB_PORT=5432" \
  --set-secrets "DB_PASSWORD=prod_db_password:latest" \
  --allow-unauthenticated
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

cat > /tmp/cloudbuild-frontend.yaml <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend:latest', '-f', 'Dockerfile.frontend', '--build-arg', 'VITE_API_URL=${BACKEND_URL}', '.']
images:
  - 'europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend:latest'
EOF
gcloud builds submit --config=/tmp/cloudbuild-frontend.yaml --region=europe-west3 .

# 5.2 Deploy (minimal flags)
gcloud run deploy inspi-frontend \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend:latest \
  --region europe-west3

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

cat > /tmp/cloudbuild-frontend-food.yaml <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest', '-f', 'Dockerfile.frontend-food', '--build-arg', 'VITE_API_URL=${BACKEND_URL}', '.']
images:
  - 'europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest'
EOF
gcloud builds submit --config=/tmp/cloudbuild-frontend-food.yaml --region=europe-west3 .

# 6.2 Deploy (minimal flags)
gcloud run deploy inspi-frontend-food \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest \
  --region europe-west3

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
