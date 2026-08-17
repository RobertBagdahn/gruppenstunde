## 1. Code-Änderungen

- [x] 1.1 Backend `production.py`: `SESSION_COOKIE_SAMESITE` von `"None"` auf `"Lax"` ändern
- [x] 1.2 Backend `production.py`: `CSRF_COOKIE_SAMESITE` von `"None"` auf `"Lax"` ändern
- [x] 1.3 `nginx.conf.template`: Zeile `proxy_cookie_path / "/; SameSite=Lax";` entfernen
- [x] 1.4 Makefile (`build-frontend`): `--build-arg VITE_API_URL=$${BACKEND_URL}` entfernen
- [x] 1.5 Makefile (`build-frontend-food`): `--build-arg VITE_API_URL=$${BACKEND_URL}` entfernen
- [x] 1.6 Deploy skill (`.opencode/skills/deploy/SKILL.md`): `VITE_API_URL`-Referenzen aus Build-Schritten entfernen

## 2. Code deployen (vor DB-Migration)

- [x] 2.1 Backend-Image bauen + pushen (via Cloud Build oder `make build-backend`)
- [x] 2.2 Backend deployen (`make deploy-backend`)
- [x] 2.3 Prüfen: `curl /api/auth/csrf/` retourniert `SameSite=Lax`

## 3. Neue DB-Instance in west1 erstellen

- [x] 3.1 Instance erstellen: `gcloud sql instances create inspi-db-west1 --region=europe-west1 --database-version=POSTGRES_15 --tier=db-f1-micro`
- [x] 3.2 pgvector aktivieren: `CREATE EXTENSION vector;` via Cloud SQL Proxy
- [x] 3.3 Backups aktivieren: `--backup-start-time=02:00`
- [x] 3.4 Datenbank anlegen: `gcloud sql databases create inspi --instance=inspi-db-west1`
- [x] 3.5 User anlegen: `gcloud sql users create inspi --instance=inspi-db-west1 --password=<passwort>`
- [x] 3.6 Prüfen: Verbindung zur neuen Instance via psql möglich

## 4. DB-Migration (Downtime ~30min)

- [x] 4.1 Manuelles Backup der alten DB erstellen: `gcloud sql backups create --instance=inspi-db`
- [x] 4.2 Cloud SQL Proxy für west3 starten: `cloud-sql-proxy inspi-441320:europe-west3:inspi-db --port 5433`
- [x] 4.3 Cloud SQL Proxy für west1 starten: `cloud-sql-proxy inspi-441320:europe-west1:inspi-db-west1 --port 5444`
- [x] 4.4 pg_dump von west3: `pg_dump -h localhost -p 5433 -U inspi -d inspi --no-owner --no-acl --format=custom > dump.dump`
- [x] 4.5 pg_restore nach west1: `pg_restore -h localhost -p 5444 -U postgres --no-owner --no-acl -d inspi dump.dump`
- [x] 4.6 Daten-Integrität prüfen (Row-Counts: 119 Tabellen, 230 Migrations, 7 User)

## 5. Backend auf neue DB umstellen

- [x] 5.1 Secret Manager: `prod_db_password`-Secret updaten (Passwort gleich, kein Update nötig)
- [x] 5.2 Backend-Umgebungsvariable `DB_HOST` updaten + `--add-cloudsql-instances` für neue Instance
- [x] 5.3 Backend neustarten (Revision 00011-xrf)
- [x] 5.4 Prüfen: API-Endpunkte funktionieren (`/api/recipes/` → 249 recipes)
- [x] 5.5 Migrationen nachholen: `supply.0047_ingredientgroup_ingredient_groups` fehlte → via Proxy ausgeführt
- [x] 5.6 `inspi-migrate` Job auf neue DB umgestellt + Secrets nachgerüstet + erfolgreich ausgeführt

## 6. Frontend bauen + deployen

- [x] 6.1 Main-Frontend-Image bauen: `make build-frontend` (ohne VITE_API_URL)
- [x] 6.2 Main-Frontend deployen: `gcloud run deploy inspi-frontend --region europe-west1`
- [x] 6.3 Food-Frontend-Image bauen: `make build-frontend-food` (ohne VITE_API_URL)
- [x] 6.4 Food-Frontend deployen: `gcloud run deploy inspi-frontend-food --region europe-west1`
- [x] 6.5 Prüfen: Keine `inspi-backend-*.run.app` URL in gebauten JS-Bundles
- [x] 6.6 Makefile: `GCP_RUN_REGION`, `CLOUD_SQL_INSTANCE` + deploy targets aktualisiert
- [x] 6.7 SKILL.md: Regionen, DB-Instance, Connection-Strings aktualisiert

## 7. Alte DB aufräumen

- [ ] 7.1 Prüfen: Backend läuft stabil auf neuer DB (24h warten optional)
- [x] 7.2 Alte Instance löschen: `gcloud sql instances delete inspi-db`
- [x] 7.3 Finales Backup von inspi-db vor Löschen erstellt

## 8. Verifikation

- [ ] 8.1 Login auf gruppenstunde.de (Desktop Chrome)
- [ ] 8.2 Login auf essensplan.app (Desktop Chrome)
- [ ] 8.3 Login auf essensplan.app (iPhone Chrome/Safari) — Kernfix
- [ ] 8.4 API-Calls prüfen: Requests gehen durch nginx (kein Direct-CORS)
- [ ] 8.5 Set-Cookie-Header prüfen: `SameSite=Lax`, kein `SameSite=None`
