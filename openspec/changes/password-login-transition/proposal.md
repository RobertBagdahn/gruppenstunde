## Why

Social login is live in code, but no OAuth clients are configured in production yet and all existing accounts use e-mail and password. Rolling out "social login only" would lock everybody out. Existing logins must keep working during a transition period.

## What Changes

- E-mail/password login and registration are available again behind `AUTH_PASSWORD_LOGIN_ENABLED` (default on). `POST /api/auth/login/` and `POST /api/auth/register/` return HTTP 404 once the switch is off.
- `GET /api/auth/providers/` announces `password_login: bool`; the login page/dialog shows the e-mail form only then, next to configured providers.
- `/register` opens the login page in registration mode.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `social-login`: "Ausschließlich Social Login" gets a switchable transition period for e-mail/password accounts.

## Impact

- Backend: `core/api.py`, `core/auth/passwords.py`, `core/schemas.py` (`AuthProvidersOut.password_login`, `PasswordLoginIn`, `PasswordRegisterIn`), `inspi/settings/base.py`.
- Frontends: `schemas/auth.ts` (Zod `password_login`, `PasswordLoginSchema`, `PasswordRegisterSchema`), `api/auth.ts`, `components/auth/PasswordLoginForm.tsx`, `LoginPanel`, `LoginPage`, `RegisterPage` in `frontend/` and `frontend-food/`.
- No migrations. Switching off later: set `AUTH_PASSWORD_LOGIN_ENABLED=false` on the backend service.
