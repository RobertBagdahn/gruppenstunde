## 1. Cleanup

- [x] 1.1 Delete `Dockerfile.db`
- [x] 1.2 Remove `deploy-db`, `push-db`, `build-db` targets from Makefile
- [x] 1.3 Remove Cloud Build targets (`cloudbuild-pr.yaml` references) from Makefile
- [x] 1.4 Remove OpenTofu targets from Makefile
- [x] 1.5 Remove `deploy-frontend` GCS rsync target from Makefile

## 2. Frontend Container

- [x] 2.1 Create `nginx.conf.template` with `/api/*` proxy_pass to `$BACKEND_URL` and SPA fallback
- [x] 2.2 Create `docker-entrypoint.sh` that runs envsubst and starts Nginx
- [x] 2.3 Create `Dockerfile.frontend` (multi-stage: Node build → Nginx alpine with entrypoint)

## 3. Backend Adjustments

- [x] 3.1 Update `backend/inspi/settings/production.py` ALLOWED_HOSTS to support *.run.app URLs via env var
- [x] 3.2 Ensure `DB_HOST` default points to a real Cloud SQL Private IP pattern (remove old /cloudsql/ socket path)

## 4. Makefile Targets

- [x] 4.1 Add `FRONTEND_IMAGE` variable (analogous to `BACKEND_IMAGE`)
- [x] 4.2 Add `build-frontend` target: `podman build -t $(FRONTEND_IMAGE):latest -f Dockerfile.frontend .`
- [x] 4.3 Add `push-frontend` target: `podman push $(FRONTEND_IMAGE):latest`
- [x] 4.4 Add `deploy-backend` target: `gcloud run deploy` with VPC connector and DB env vars
- [x] 4.5 Add `deploy-frontend` target: query backend URL, then `gcloud run deploy` with BACKEND_URL env
- [x] 4.6 Add `deploy` target: `deploy-backend` then `deploy-frontend`
- [x] 4.7 Add `setup-infra` target: create Artifact Registry, VPC Connector, Cloud SQL instance + DB + user

## 5. Verification

- [x] 5.1 Test `make build-frontend` builds successfully with Podman
- [x] 5.2 Test `make build-backend` still builds successfully
- [x] 5.3 Verify nginx.conf.template correctly proxies /api/* (local test with podman run)
