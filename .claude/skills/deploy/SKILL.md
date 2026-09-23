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
| Artifact Registry / Cloud Build Region | `europe-west1` |
| Cloud Run Region (alle Services) | `europe-west1` |
| Artifact Registry | `europe-west1-docker.pkg.dev/inspi-441320/inspi` |
| Backend Image | `europe-west1-docker.pkg.dev/inspi-441320/inspi/backend:latest` |
| Frontend Image | `europe-west1-docker.pkg.dev/inspi-441320/inspi/frontend:latest` |
| Frontend Food Image | `europe-west1-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest` |
| Cloud SQL Instance | `inspi-db-west1` |
| Cloud SQL Connection | `inspi-441320:europe-west1:inspi-db-west1` |
| Backend Service | `inspi-backend` |
| Backend URL | `https://inspi-backend-24xnoearra-ew.a.run.app` |
| Frontend Service | `inspi-frontend` |
| Frontend Food Service | `inspi-frontend-food` |

**Alle Services laufen in `europe-west1`.** Images werden in `europe-west1` Artifact Registry gebaut und gespeichert.

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

gcloud builds submit --config=/tmp/cloudbuild.yaml --region=europe-west1 .
```

### Deploy: Minimal flags — preserve existing config

When deploying a new image to an existing service, use **only `--image` and `--region`**. Cloud Run preserves all existing env vars, secrets, CPU/memory, and scaling settings:

```bash
gcloud run deploy inspi-backend \
  --image europe-west1-docker.pkg.dev/inspi-441320/inspi/backend:latest \
  --region europe-west1
```

Only add explicit flags when you need to **change** configuration. Using all flags risks overwriting secrets or env vars.

**⚠️ WICHTIG: Traffic muss explizit umgeleitet werden!** `gcloud run deploy --image` erstellt zwar eine neue Revision, routet aber den Traffic nicht immer zuverlässig auf die neueste Revision um. Nach **jedem** Deploy IMMER ausführen:

```bash
gcloud run services update-traffic <SERVICE> --region europe-west1 --to-latest
```

### Frontend: nginx reverse proxy for API

Frontends call the backend through nginx reverse proxy (same origin). The `VITE_API_URL` is intentionally empty:

- `Dockerfile.frontend` and `Dockerfile.frontend-food` use default `VITE_API_URL=""`
- Frontend code uses relative URLs (`/api/...`) through nginx proxy_pass
- Backend has CORS enabled for frontend origins in `inspi/settings/production.py` (fallback)
- nginx proxies `/api/` to the backend Cloud Run service

**Why proxy:** iOS WebKit blocks cross-origin cookies. Same-origin proxying fixes iOS login.

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

### DJANGO_SECRET_KEY & other secrets via Secret Manager

Use `--set-secrets` instead of plain env vars for all secrets:

```bash
gcloud run deploy inspi-backend \
  --set-secrets "DJANGO_SECRET_KEY=prod_django_secret_key:latest,DB_PASSWORD=prod_db_password:latest,EMAIL_HOST_PASSWORD=gmail_app_password:latest"
```

**Critical:** Without `DJANGO_SECRET_KEY`, Gunicorn fails to boot with `ImproperlyConfigured: DJANGO_SECRET_KEY is not configured`. This secret (`prod_django_secret_key`) must always be included when using `--set-secrets`. If you only use `--image` and `--region` (minimal deploy), existing secrets are preserved — but any use of `--set-secrets` requires listing ALL secrets, as it overwrites the entire secrets configuration.

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
gcloud artifacts repositories describe inspi --location=europe-west1 --format="value(name)"

# 1.4 Cloud SQL instance exists and running?
gcloud sql instances describe inspi-db-west1 --format="value(state)"

# 1.5 Cloud Run services exist?
gcloud run services list --format="table(SERVICE,REGION,URL,LAST_DEPLOYED)"
```

Present results as a checklist:
```
Pre-Flight Results:
[x] gcloud authenticated as: <email>
[x] Project: inspi-441320
[x] Artifact Registry: inspi (europe-west1)
[x] Cloud SQL: inspi-db-west1 (RUNNABLE)
[x] Cloud Run services: inspi-backend, inspi-frontend, inspi-frontend-food
```

If project is not `inspi-441320`, **ask the user** before continuing.

### Phase 2: Infrastructure (OpenTofu)

Ask: "Infrastructure changes via OpenTofu prüfen und anwenden?" — proceed only on confirmation.

```bash
# 2.1 Navigate to terraform directory
cd terraform

# 2.2 Init (if not already)
tofu init

# 2.3 Plan – show full diff
tofu plan
```

Show the plan output. Ask: "Soll ich diese Änderungen anwenden (`tofu apply`)?" — only on confirmation.

```bash
# 2.4 Apply
tofu apply

# 2.5 Return to root
cd ..
```

If the user declines, skip apply and continue with the plan visible.

### Phase 3: Database Check

```bash
# 3.1 Check Cloud SQL connectivity
gcloud sql instances describe inspi-db-west1 --format="value(ipAddresses[0].ipAddress)"

# 3.2 Check backend API is reachable
BACKEND_URL=$(gcloud run services describe inspi-backend --region=europe-west1 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/docs"
```

Expected: HTTP 200. If not, the backend may need redeployment.

```bash
# 3.3 Seed check: verify data exists
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

Only run `add_users` and `seed_all` when the target database is empty for the relevant data. Use the `--if-empty` guards below; do not run unguarded seed/user commands on an existing database.

### Phase 4: Deploy Backend

Ask: "Backend deployen? (build + push + deploy)" — proceed only on confirmation.

```bash
# 3.1 Build via Cloud Build (NEVER local podman on ARM Mac)
cat > /tmp/cloudbuild-backend.yaml <<'EOF'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'europe-west1-docker.pkg.dev/inspi-441320/inspi/backend:latest', '-f', 'Dockerfile.backend', '.']
images:
  - 'europe-west1-docker.pkg.dev/inspi-441320/inspi/backend:latest'
EOF
gcloud builds submit --config=/tmp/cloudbuild-backend.yaml --region=europe-west1 .

# 3.2 Deploy (minimal flags — preserves existing env/secrets/scaling)
gcloud run deploy inspi-backend \
  --image europe-west1-docker.pkg.dev/inspi-441320/inspi/backend:latest \
  --region europe-west1

# 3.3 Ensure traffic routes to the new revision
# (gcloud run deploy --image doesn't always update traffic automatically)
gcloud run services update-traffic inspi-backend --region=europe-west1 --to-latest

# 3.4 Verify
BACKEND_URL=$(gcloud run services describe inspi-backend --region=europe-west1 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/docs"
```

**First-time setup only** (when service config needs to be set):
```bash
DB_HOST=$(gcloud sql instances describe inspi-db-west1 --format="value(ipAddresses[0].ipAddress)")
gcloud run deploy inspi-backend \
  --image europe-west1-docker.pkg.dev/inspi-441320/inspi/backend:latest \
  --region europe-west1 \
  --port 8000 \
  --cpu 1 --memory 512Mi \
  --min-instances 0 --max-instances 10 \
  --set-env-vars "DJANGO_SETTINGS_MODULE=inspi.settings.production,GOOGLE_CLOUD_PROJECT=inspi-441320,GCS_BUCKET_NAME=inspi-media,DB_HOST=${DB_HOST},DB_NAME=inspi,DB_USER=inspi,DB_PORT=5432" \
  --set-secrets "DJANGO_SECRET_KEY=prod_django_secret_key:latest,DB_PASSWORD=prod_db_password:latest,EMAIL_HOST_PASSWORD=gmail_app_password:latest" \
  --allow-unauthenticated
```

Expected: HTTP 200. If not, show error and ask.

### Phase 5: Run Migrations

Ask: "Django Migrations auf dem Backend ausführen?"

**Via Cloud SQL Proxy (local)**

```bash
# Start proxy if not running
cloud-sql-proxy inspi-441320:europe-west1:inspi-db-west1 --port 5444 &

# Run migrations
DATABASE_URL="postgres://inspi:<PASSWORD>@localhost:5433/inspi" uv run python manage.py migrate --noinput
```

### Phase 6: Create Users

First check whether users already exist. Ask "Sollen Benutzer angelegt werden?" only when the user table is empty.

Uses the `add_users --if-empty` management command to create initial users. Requires Cloud SQL Proxy or a Cloud Run Job.

**Option A: Via Cloud SQL Proxy (local)**

```bash
# Start proxy if not running (if not already running)
cloud-sql-proxy inspi-441320:europe-west1:inspi-db-west1 --port 5444 &

# Run add_users
DATABASE_URL="postgres://inspi:<PASSWORD>@localhost:5433/inspi" uv run python manage.py add_users --if-empty
```

**Option B: Via Cloud Run Jobs**

```bash
gcloud run jobs execute inspi-add-users --region europe-west1 --wait
```

The `add_users` command creates:
- Superuser (admin)
- Test users for development

### Phase 7: Seed Database

First check whether seed data already exists. Ask "Soll die Datenbank geseedet werden?" only when the relevant seed sections are empty.

Uses the `seed_all --if-empty` management command to seed initial/test data. Requires Cloud SQL Proxy or a Cloud Run Job.

**Option A: Via Cloud SQL Proxy (local)**

```bash
# Start proxy if not running (if not already running)
cloud-sql-proxy inspi-441320:europe-west1:inspi-db-west1 --port 5444 &

# Run seed_all
DATABASE_URL="postgres://inspi:<PASSWORD>@localhost:5433/inspi" uv run python manage.py seed_all --if-empty
```

**Option B: Via Cloud Run Jobs**

```bash
gcloud run jobs execute inspi-seed --region europe-west1 --wait
```

The `seed_all` command seeds:
- Content (sessions, blogs, games, materials)
- Recipes, events, and planner data
- **Breakfast catalog** (via internal calls to `seed_breakfast_catalog` and `seed_breakfast_recipes`):
  - 4 content.Tags (breakfast-base, breakfast-topping, breakfast-drink, breakfast-warm-meal)
  - 6 base bread ingredients, 17 topping ingredients, 6 drink ingredients, 3 drink recipes
  - 5 warm breakfast recipes + Müsli (cold_meal)

For existing prod databases where `seed_all --if-empty` already ran before seed_breakfast_catalog existed:
1. Start Cloud SQL Proxy
2. Run `uv run python manage.py seed_breakfast_catalog`
3. Run `uv run python manage.py seed_breakfast_recipes`

### Phase 8: Deploy Frontend

Ask: "Frontend deployen? (build + push + deploy)" — proceed only on confirmation.

```bash
# 7.1 Build (no VITE_API_URL — API calls go through nginx proxy)
cat > /tmp/cloudbuild-frontend.yaml <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'europe-west1-docker.pkg.dev/inspi-441320/inspi/frontend:latest', '-f', 'Dockerfile.frontend', '.']
images:
  - 'europe-west1-docker.pkg.dev/inspi-441320/inspi/frontend:latest'
EOF
gcloud builds submit --config=/tmp/cloudbuild-frontend.yaml --region=europe-west1 .

# 7.2 Deploy (minimal flags)
gcloud run deploy inspi-frontend \
  --image europe-west1-docker.pkg.dev/inspi-441320/inspi/frontend:latest \
  --region europe-west1

# 7.3 Ensure traffic routes to the new revision
gcloud run services update-traffic inspi-frontend --region=europe-west1 --to-latest

# 7.4 Verify
FRONTEND_URL=$(gcloud run services describe inspi-frontend --region=europe-west1 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/"
```

Expected: HTTP 200.

### Phase 9: Deploy Frontend Food

Ask: "Food Frontend deployen? (build + push + deploy)" — proceed only on confirmation.

```bash
# 8.1 Build (no VITE_API_URL — API calls go through nginx proxy)
cat > /tmp/cloudbuild-frontend-food.yaml <<EOF
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'europe-west1-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest', '-f', 'Dockerfile.frontend-food', '.']
images:
  - 'europe-west1-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest'
EOF
gcloud builds submit --config=/tmp/cloudbuild-frontend-food.yaml --region=europe-west1 .

# 8.2 Deploy to the Food Frontend region (minimal flags)
gcloud run deploy inspi-frontend-food \
  --image europe-west1-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest \
  --region europe-west1

# 8.3 Ensure traffic routes to the new revision
gcloud run services update-traffic inspi-frontend-food --region=europe-west1 --to-latest

# 8.4 Verify
FRONTEND_FOOD_URL=$(gcloud run services describe inspi-frontend-food --region=europe-west1 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_FOOD_URL}/"
```

Expected: HTTP 200.

### Phase 10: Post-Deploy Summary

```bash
gcloud run services list --format="table(SERVICE,REGION,URL,LAST_DEPLOYED)"
```

Show final summary:
```
Deployment Complete:
  Backend:       <url> (HTTP <status>)
  Frontend:      <url> (HTTP <status>)
  Frontend Food: <url> (HTTP <status>)
  DB:            inspi-db-west1 (<state>)
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
- "nur backend" → Only Phase 4
- "nur frontend" → Only Phase 8+9
- "nur checks" → Only Phase 1+3
- "nur migrations" → Only Phase 5
- "nur users" → Only Phase 6
- "nur seeding" → Only Phase 7
- "nur tofu" / "nur terraform" → Only Phase 2

Adapt accordingly.
