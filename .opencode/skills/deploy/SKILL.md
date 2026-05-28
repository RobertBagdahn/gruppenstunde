---
name: deploy
description: Interactive deployment skill for Inspi. Checks infrastructure, builds and deploys backend and frontend step by step. Asks before each action.
license: MIT
metadata:
  author: inspi
  version: "1.0"
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
| Backend Service | `inspi-backend` |
| Frontend Service | `inspi-frontend` |
| Frontend Food Service | `inspi-frontend-food` |
| VPC Connector | `inspi-connector` |

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
[x] Cloud Run services: inspi-backend, inspi-frontend
```

If project is not `inspi-441320`, **ask the user** before continuing.

### Phase 2: Database Check

```bash
# 2.1 Check Cloud SQL connectivity
gcloud sql instances describe inspi-db --format="value(ipAddresses[0].ipAddress)"

# 2.2 Check migrations are up to date (via Cloud Run exec or local proxy)
# Try hitting the backend API to verify DB is reachable
BACKEND_URL=$(gcloud run services describe inspi-backend --region=europe-west3 --format="value(status.url)")
curl -s "${BACKEND_URL}/api/docs" | head -c 200
```

```bash
# 2.3 Seed check: verify data exists by calling a public API endpoint
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

If seeds are missing, **ask the user**:
- "Seeds sind nicht eingespielt. Soll ich `manage.py seed_all` auf dem Service ausführen? (Dazu muss lokal eine DB-Verbindung bestehen oder ein Cloud Run Job genutzt werden.)"

### Phase 3: Deploy Backend

Ask: "Backend deployen? (build + push + deploy)" — proceed only on confirmation.

```bash
# 3.1 Build
podman build -t europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest -f Dockerfile.backend .

# 3.2 Push
podman push europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest

# 3.3 Get DB host
DB_HOST=$(gcloud sql instances describe inspi-db --format="value(ipAddresses[0].ipAddress)")

# 3.4 Deploy
gcloud run deploy inspi-backend \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest \
  --region europe-west3 \
  --port 8000 \
  --cpu 1 --memory 512Mi \
  --min-instances 0 --max-instances 10 \
  --vpc-connector inspi-connector \
  --set-env-vars DJANGO_SETTINGS_MODULE=inspi.settings.production,DB_HOST=${DB_HOST},DB_NAME=inspi,DB_USER=inspi,DB_PASSWORD=${DB_PASSWORD} \
  --allow-unauthenticated
```

**IMPORTANT**: `DB_PASSWORD` must be provided. Ask the user for it if not set in environment.

```bash
# 3.5 Verify
BACKEND_URL=$(gcloud run services describe inspi-backend --region=europe-west3 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}/api/docs"
```

Expected: HTTP 200. If not, show error and ask.

### Phase 4: Run Migrations (on deployed service)

Ask: "Django Migrations auf dem Backend ausführen?"

```bash
# Option A: Via Cloud Run Jobs (preferred)
gcloud run jobs create inspi-migrate \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/backend:latest \
  --region europe-west3 \
  --vpc-connector inspi-connector \
  --set-env-vars DJANGO_SETTINGS_MODULE=inspi.settings.production,DB_HOST=${DB_HOST},DB_NAME=inspi,DB_USER=inspi,DB_PASSWORD=${DB_PASSWORD} \
  --command "python" \
  --args "manage.py,migrate,--noinput" \
  --execute-now \
  --wait

# Option B: If job already exists, just execute
gcloud run jobs execute inspi-migrate --region europe-west3 --wait
```

Show job logs after execution.

### Phase 5: Deploy Frontend

Ask: "Frontend deployen? (build + push + deploy)" — proceed only on confirmation.

```bash
# 5.1 Build
podman build -t europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend:latest -f Dockerfile.frontend .

# 5.2 Push
podman push europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend:latest

# 5.3 Get backend URL for env
BACKEND_URL=$(gcloud run services describe inspi-backend --region=europe-west3 --format="value(status.url)")

# 5.4 Deploy
gcloud run deploy inspi-frontend \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend:latest \
  --region europe-west3 \
  --port 80 \
  --cpu 1 --memory 256Mi \
  --min-instances 0 --max-instances 5 \
  --set-env-vars BACKEND_URL=${BACKEND_URL} \
  --allow-unauthenticated

# 5.5 Verify
FRONTEND_URL=$(gcloud run services describe inspi-frontend --region=europe-west3 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/"
```

Expected: HTTP 200.

### Phase 6: Deploy Frontend Food

Ask: "Food Frontend deployen? (build + push + deploy)" — proceed only on confirmation.

```bash
# 6.1 Build
podman build -t europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest -f Dockerfile.frontend-food .

# 6.2 Push
podman push europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest

# 6.3 Get backend URL for env
BACKEND_URL=$(gcloud run services describe inspi-backend --region=europe-west3 --format="value(status.url)")

# 6.4 Deploy
gcloud run deploy inspi-frontend-food \
  --image europe-west3-docker.pkg.dev/inspi-441320/inspi/frontend-food:latest \
  --region europe-west3 \
  --port 80 \
  --cpu 1 --memory 256Mi \
  --min-instances 0 --max-instances 5 \
  --set-env-vars BACKEND_URL=${BACKEND_URL} \
  --allow-unauthenticated

# 6.5 Verify
FRONTEND_FOOD_URL=$(gcloud run services describe inspi-frontend-food --region=europe-west3 --format="value(status.url)")
curl -s -o /dev/null -w "%{http_code}" "${FRONTEND_FOOD_URL}/"
```

Expected: HTTP 200.

### Phase 7: Post-Deploy Summary

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
- **ALWAYS** show command output before asking to continue
- **ALWAYS** ask for secrets (DB_PASSWORD) rather than guessing
- If a command fails, show the error and ask what to do — don't retry automatically
- If the user says "skip", move to the next phase

---

## Partial Deploys

The user can request partial deploys:
- "nur backend" → Skip Phase 5
- "nur frontend" → Skip Phase 3+4
- "nur checks" → Only Phase 1+2
- "nur migrations" → Only Phase 4

Adapt accordingly.
