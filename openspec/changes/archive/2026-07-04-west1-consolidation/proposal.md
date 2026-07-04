## Why

Zwei unabhängige Probleme, die dieselbe Ursache haben: Die Infrastruktur ist über zwei GCP-Regionen verteilt und verursacht sowohl technische Probleme (iOS-Login) als auch Latenz/Verwirrung (Cross-Region DB-Calls). Wir konsolidieren Backend + DB in europe-west1 und fixen den iOS-Login durch Same-Origin-API-Routing.

### Problem 1: DB in west3, Backend in west1

Cloud SQL `inspi-db` steht in europe-west3, der restliche Stack (`inspi-backend`, `inspi-frontend`, `inspi-frontend-food`) in europe-west1. Cloud Run nutzt den Cloud SQL Auth Proxy, der cross-region instabil ist.

### Problem 2: iOS-Login defekt

Das Frontend ruft die API direkt Cross-Origin auf (`VITE_API_URL`), iOS WebKit blockiert die Session-Cookies als Third-Party.

## What Changes

### DB-Migration (west3 → west1)

- **BREAKING**: Neue Cloud SQL Instance `inspi-db-west1` in europe-west1 erstellen
- pg_dump aus west3 → pg_restore nach west1 (ca. 30min Downtime)
- Backend-Umgebungsvariable `DB_HOST` auf neue IP umstellen
- Alte Instance in west3 löschen

### iOS-Login-Fix

- **BREAKING**: `VITE_API_URL` aus allen Frontend-Builds entfernen → API-Calls relativ (`/api/...`)
- **BREAKING**: Backend `SESSION_COOKIE_SAMESITE` und `CSRF_COOKIE_SAMESITE` von `"None"` auf `"Lax"` ändern
- `proxy_cookie_path`-Hack aus `nginx.conf.template` entfernen

## Capabilities

### New Capabilities

Keine neuen Capabilities — Infrastruktur-Konsolidierung und Config-Fixes.

### Modified Capabilities

- `infrastructure`: DB-Region ändert sich von west3 nach west1; API-Routing von Direct-CORS zu Same-Origin-Proxy
- `auth-session`: SameSite-Konfiguration für Session/CSRF-Cookies von `None` auf `Lax`

## Impact

- **Cloud SQL**: Neue Instance in west1, alte in west3 wird gelöscht
- **Backend**: `production.py` (SameSite) + DB_HOST env var
- **Frontend**: Build-Prozess (VITE_API_URL entfernen) + nginx config
- **Secrets**: `prod_db_password` bleibt erhalten (gleiches Passwort)
- **Backups**: Aktuell deaktiviert — beim Neuanlegen aktivieren
- **Downtime**: ca. 30min (DB-Dump + Restore)
