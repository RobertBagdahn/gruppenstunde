## 1. Backend

- [x] 1.1 `AUTH_PASSWORD_LOGIN_ENABLED` (default True) in `inspi/settings/base.py`
- [x] 1.2 `POST /api/auth/login/` und `POST /api/auth/register/` (404 wenn deaktiviert), `core/auth/passwords.py`
- [x] 1.3 `AuthProvidersOut.password_login`, `PasswordLoginIn`, `PasswordRegisterIn`
- [x] 1.4 Tests: Login, falsches Passwort, Registrierung, doppelte E-Mail, schwaches Passwort, deaktivierter Schalter

## 2. Frontends

- [x] 2.1 Zod `password_login`, `PasswordLoginSchema`, `PasswordRegisterSchema`; Hooks `usePasswordLogin`, `usePasswordRegister`
- [x] 2.2 `PasswordLoginForm` in `LoginPanel` (nur bei `password_login`), `/register` → `/login?mode=register`
- [x] 2.3 E2E: Passwort-Login in der Übergangszeit

## 3. Rollout

- [x] 3.1 Backend, Migrationen und beide Frontends nach Deploy-Skill ausrollen (Prod-Backend liefert `password_login: true`, Stand 2026-10-11)
- [x] 3.2 Smoke-Test in Produktion: Login mit bestehendem Passwort-Konto, Session, öffentliche Inhalte (2026-10-11 per curl: `GET /api/auth/providers/` → `password_login: true`; `GET /api/auth/me/` anonym → 200 ohne Identität; `POST /api/auth/login/` mit falschen Daten → 400 `invalid_credentials`; `GET /api/recipes/` → 200. Login mit echtem Konto nicht per curl wiederholt, da keine Prod-Zugangsdaten im Review; Rollout laut Owner erfolgt)

## 4. Spec-Abgleich

- [x] 4.1 `auth-session`-Delta: CSRF-Requirement an die Entscheidung „kein CSRF-Token für die JSON-API, SameSite=Lax“ angepasst
