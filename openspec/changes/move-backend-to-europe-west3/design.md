## Context

The `inspi-backend` Cloud Run service was originally deployed in `europe-west1` while the Cloud SQL database `inspi-db` resides in `europe-west3`. Cloud Run's built-in Cloud SQL Auth Proxy works reliably only within the same region. Cross-region connections cause intermittent schema resolution failures — PostgreSQL returns `column does not exist` for columns that are physically present in the database.

The main frontend (`inspi-frontend`) and food frontend (`inspi-frontend-food`) also run in `europe-west1`. They call the backend via CORS and are unaffected by the backend's region — they only need the correct backend URL.

## Goals / Non-Goals

**Goals:**
- Move `inspi-backend` to `europe-west3` (same region as `inspi-db`)
- Eliminate cross-region Cloud SQL proxy errors
- Preserve all existing configuration: env vars, secrets, CPU/memory, scaling, IAM
- Minimize downtime during the migration

**Non-Goals:**
- Moving the frontends or database — only the backend service changes region
- Code changes — this is purely deployment/infrastructure
- Terraform changes — the service is managed via gcloud CLI, not OpenTofu

## Decisions

### 1. Recreate vs deploy across regions
Cloud Run does not support changing a service's region. We must **create a new service** in `europe-west3`, then **delete the old one** in `europe-west1`.

**Why not keep both:** Running two services with the same image but different regions adds complexity, cost, and confusion. The old service must be deleted to prevent accidental traffic.

### 2. CORS origins update
The new backend URL (e.g., `https://inspi-backend-<hash>.ew3.run.app`) must be added to `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in `inspi/settings/production.py`. The old `europe-west1` URL can be removed after cutover.

### 3. Frontend VITE_API_URL
The frontend build-time env var `VITE_API_URL` hardcodes the backend URL. After migration, the next frontend deploy must use the new URL. Until then, the old frontend revision continues to work (CORS allows both old and new origin during transition).

### 4. Deploy skill update
The deploy skill in `.opencode/skills/deploy/SKILL.md` hardcodes `europe-west3` for backend already in its constants, but the Phase 4 deploy commands use `--region europe-west3`. The skill's Backend URL constant should be updated to reflect the actual `europe-west3` URL after migration.

## Risks / Trade-offs

- **[Downtime window]** Creating the new service and deleting the old one means a brief period where neither exists. Mitigation: create the new service first, verify it works, then update DNS/CORS, then delete old. The gap is <1 minute.
- **[New URL]** Any system that hardcodes the backend URL (e.g., monitoring, external integrations) must be updated. Mitigation: no external systems hardcode the URL; only frontends and CORS config reference it.
- **[Session loss]** Users logged into the old backend will have their session cookies tied to the old domain. The new service uses a different `.run.app` URL. Mitigation: sessions are cookie-based; the domain changes, so users must re-authenticate. This is a one-time event.
