## 1. Create new backend service in europe-west3

- [ ] 1.1 Build and push the current image via Cloud Build (to ensure latest code is in the registry)
- [ ] 1.2 Deploy `inspi-backend` to `europe-west3` with full config: env vars, secrets, CORS origins, CPU/memory, scaling
- [ ] 1.3 Verify new service responds: `curl -s -o /dev/null -w "%{http_code}" https://<new-url>/api/docs` → HTTP 200

## 2. Update CORS configuration

- [ ] 2.1 Add new `europe-west3` backend URL to `CORS_ALLOWED_ORIGINS` in `inspi/settings/production.py`
- [ ] 2.2 Add new URL to `CSRF_TRUSTED_ORIGINS` in `inspi/settings/production.py`
- [ ] 2.3 Remove old `europe-west1` backend URL from both lists
- [ ] 2.4 Build, push, and deploy the updated config

## 3. Update deploy skill

- [ ] 3.1 Update `Backend URL` constant in `.opencode/skills/deploy/SKILL.md` to the new `europe-west3` URL
- [ ] 3.2 Verify all Phase 4 commands use `--region europe-west3` (already correct per skill defaults)

## 4. Clean up old service

- [ ] 4.1 Delete old `inspi-backend` service in `europe-west1`: `gcloud run services delete inspi-backend --region=europe-west1`
- [ ] 4.2 Verify old service is gone: `gcloud run services list --region=europe-west1`

## 5. Verify production

- [ ] 5.1 Run database query endpoint (`/api/tags/`) → HTTP 200 with valid tag data
- [ ] 5.2 Run recipes endpoint (`/api/recipes/`) → HTTP 200
- [ ] 5.3 Run sessions endpoint (`/api/sessions/`) → HTTP 200
- [ ] 5.4 Verify frontend can reach the new backend (CORS check)
