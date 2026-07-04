## Why

Der Login auf essensplan.app (und gruppenstunde.de) schlägt auf iOS-Geräten fehl, obwohl der API-Aufruf zum Login selbst erfolgreich ist (HTTP 200). Grund: Die Frontends machen direkte Cross-Origin-API-Calls zum Backend (via `VITE_API_URL`). iOS WebKit (Chrome/Safari) blockiert die Session-Cookies als Third-Party-Cookies. Der Empfehlungsweg: API-Calls relativ durch den nginx-Proxy routen, sodass Cookies same-origin sind und von iOS akzeptiert werden.

## What Changes

- **BREAKING**: `VITE_API_URL` wird aus allen Frontend-Builds entfernt — API-Calls werden relativ (`/api/...`) statt absolut (`https://inspi-backend-...`)
- **BREAKING**: Backend-Production-Settings: `SESSION_COOKIE_SAMESITE` und `CSRF_COOKIE_SAMESITE` von `"None"` auf `"Lax"` geändert (same-origin nach Proxy-Wechsel)
- `proxy_cookie_path`-Hack aus nginx.conf.template entfernt (nicht mehr nötig)
- Beide Frontends (main + food) werden neu gebaut und deployed
- Backend wird neu deployed
- Prod-Migrationen für `recipe_recipeitem.is_optional` und `content_tag.group` ausgeführt

## Capabilities

### New Capabilities

Keine neuen Capabilities — reine Konfigurations-/Deployment-Änderung.

### Modified Capabilities

- `infrastructure`: Frontend-API-Routing ändert sich von Direct-CORS zu Same-Origin-Proxy
- `auth-session`: SameSite-Konfiguration für Session/CSRF-Cookies ändert sich von `None` auf `Lax`

## Impact

- **Backend**: `backend/inspi/settings/production.py` — 2 Zeilen ändern
- **Frontend** (beide): `frontend-food/src/lib/api.ts` — kein Code-Change nötig (nur Build-Arg entfernen)
- **nginx**: `nginx.conf.template` — `proxy_cookie_path`-Zeile entfernen
- **Build**: Makefile + deploy skill — `VITE_API_URL`-Argumente entfernen
- **Infrastruktur**: Cloud Run Services (frontend + frontend-food) neu deployen
- **Prod-Datenbank**: Migrationen nachholen
