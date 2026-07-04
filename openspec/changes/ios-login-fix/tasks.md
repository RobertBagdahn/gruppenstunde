## 1. Backend: Cookie-SameSite ändern + proxy_cookie_path entfernen

- [ ] 1.1 In `backend/inspi/settings/production.py`: `SESSION_COOKIE_SAMESITE` von `"None"` auf `"Lax"` ändern
- [ ] 1.2 In `backend/inspi/settings/production.py`: `CSRF_COOKIE_SAMESITE` von `"None"` auf `"Lax"` ändern
- [ ] 1.3 In `nginx.conf.template`: Zeile `proxy_cookie_path / "/; SameSite=Lax";` entfernen

## 2. Frontend-Build: VITE_API_URL entfernen

- [ ] 2.1 In `Makefile` (`build-frontend`-Target): `--build-arg VITE_API_URL=$${BACKEND_URL}` entfernen
- [ ] 2.2 In `Makefile` (`build-frontend-food`-Target): `--build-arg VITE_API_URL=$${BACKEND_URL}` entfernen
- [ ] 2.3 In `cloudbuild.yaml`: Prüfen ob `VITE_API_URL` gesetzt wird — falls nein, kein Change nötig (aktuell kein VITE_API_URL)
- [ ] 2.4 In `.opencode/skills/deploy/SKILL.md`: `VITE_API_URL`-Referenzen aus Build-Schritten entfernen

## 3. Backend bauen und deployen

- [ ] 3.1 Backend-Image via Cloud Build bauen und pushen
- [ ] 3.2 Backend zu Cloud Run deployen (europe-west1)
- [ ] 3.3 Prüfen: `curl /api/auth/csrf/` retourniert `SameSite=Lax` im Set-Cookie-Header

## 4. Prod-Datenbank-Migrationen nachholen

- [ ] 4.1 Cloud SQL Proxy starten: `cloud-sql-proxy inspi-441320:europe-west1:inspi --port 5433`
- [ ] 4.2 Migrationen ausführen: `uv run python manage.py migrate`
- [ ] 4.3 Prüfen: `uv run python manage.py showmigrations` — alle `[X]`

## 5. Frontend bauen und deployen (beide)

- [ ] 5.1 Main-Frontend-Image via Makefile bauen (`make build-frontend`)
- [ ] 5.2 Main-Frontend zu Cloud Run deployen (`make deploy-frontend`)
- [ ] 5.3 Food-Frontend-Image via Makefile bauen (`make build-frontend-food`)
- [ ] 5.4 Food-Frontend zu Cloud Run deployen (`make deploy-frontend-food`)

## 6. Verifikation

- [ ] 6.1 Login auf gruppenstunde.de testen (Desktop, Chrome)
- [ ] 6.2 Login auf essensplan.app testen (Desktop, Chrome)
- [ ] 6.3 Login auf essensplan.app testen (iPhone Chrome / Safari) — Kernfix
- [ ] 6.4 API-Calls prüfen: Requests gehen durch nginx (nicht direkt zum Backend)
- [ ] 6.5 Set-Cookie-Header prüfen: `SameSite=Lax`, kein `SameSite=None`
