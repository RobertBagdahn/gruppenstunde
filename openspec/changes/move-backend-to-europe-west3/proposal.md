## Why

The backend Cloud Run service (`inspi-backend`) runs in `europe-west1` while the Cloud SQL database (`inspi-db`) is in `europe-west3`. This cross-region setup causes the built-in Cloud SQL Auth Proxy to produce intermittent schema inconsistencies — queries against columns that exist in the database fail with `column does not exist` errors, breaking all Content-API endpoints (tags, recipes, sessions).

This is a production outage: every endpoint hitting the `content_tag` table returns HTTP 500.

## What Changes

- **Move `inspi-backend` Cloud Run service from `europe-west1` to `europe-west3`** (same region as `inspi-db`)
- **Recreate the service in `europe-west3`** with identical configuration (env vars, secrets, CPU/memory, scaling, CORS origins)
- **Update deploy skill constants** to reflect the correct region (`europe-west3`)
- **No code changes** — this is purely an infrastructure/configuration change

## Capabilities

### New Capabilities

- `cloud-run-region`: Infrastructure configuration for colocating Cloud Run services with their Cloud SQL database region

### Modified Capabilities

<!-- No spec-level requirement changes — implementation detail only -->

## Impact

- **Backend URL changes** — the service gets a new `.run.app` URL in `europe-west3`
- **CORS config** in `inspi/settings/production.py` — one origin updates
- **Deploy skill** — region constants in `.opencode/skills/deploy/SKILL.md` need updating
- **Frontend** — `VITE_API_URL` build arg must reference the new backend URL (next frontend deploy)
- **OpenTofu** — `terraform/` state may need updating if it references the service
- **No data loss** — database is unchanged, same instance
