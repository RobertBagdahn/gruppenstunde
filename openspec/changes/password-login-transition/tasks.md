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

- [ ] 3.1 Backend, Migrationen und beide Frontends nach Deploy-Skill ausrollen
- [ ] 3.2 Smoke-Test in Produktion: Login mit bestehendem Passwort-Konto, Session, öffentliche Inhalte
