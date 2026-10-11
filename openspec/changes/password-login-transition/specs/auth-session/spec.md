## MODIFIED Requirements

### Requirement: Session-basierte Authentifizierung

Das System MUST Django-Session-Authentifizierung mit HTTP-only Cookies verwenden. JWT-Token SHALL NOT verwendet werden. Eine Session SHALL durch einen erfolgreichen Social Login (siehe `social-login`), – nur außerhalb der Produktion – durch den Dev-Login oder, solange die Übergangszeit mit `AUTH_PASSWORD_LOGIN_ENABLED` aktiv ist (Standard: aktiv), durch eine Anmeldung oder Registrierung mit E-Mail und Passwort über `POST /api/auth/login/` bzw. `POST /api/auth/register/` entstehen. Ist der Schalter deaktiviert, SHALL eine Anmeldung mit E-Mail und Passwort über die API NOT möglich sein. Sitzungen SHALL eine Laufzeit von 30 Tagen haben (`SESSION_COOKIE_AGE`), und jede Anfrage SHALL die Laufzeit verlängern (`SESSION_SAVE_EVERY_REQUEST`), damit Nutzer praktisch angemeldet bleiben.

#### Scenario: Erfolgreicher Login (Same-Origin)

- **GIVEN** ein Besucher mit einem Google-Konto
- **WHEN** der Besucher den Social Login über `POST /api/accounts/google/login/` startet und beim Anbieter zustimmt
- **THEN** wird ein Session-Cookie gesetzt (HTTP-only, Secure, SameSite=Lax)
- **AND** `GET /api/auth/me/` liefert `{ is_authenticated: true, user: { id, email, first_name, last_name, display_name, is_staff, is_superuser, needs_onboarding, providers } }`
- **AND** das CSRF-Token wird erneuert

#### Scenario: Anonyme Session-Abfrage

- **GIVEN** ein Besucher ohne Session
- **WHEN** das Frontend `GET /api/auth/me/` aufruft
- **THEN** antwortet das System mit HTTP 200 und `{ is_authenticated: false, user: null }`

#### Scenario: Passwort-Login in der Übergangszeit

- **GIVEN** `AUTH_PASSWORD_LOGIN_ENABLED` ist aktiv und ein Konto mit E-Mail und Passwort existiert
- **WHEN** ein Client `POST /api/auth/login/` mit korrekten Zugangsdaten sendet
- **THEN** wird ein Session-Cookie gesetzt (HTTP-only, SameSite=Lax) und das System antwortet mit HTTP 200 und den Nutzerdaten

#### Scenario: Passwort-Login nach der Übergangszeit

- **GIVEN** `AUTH_PASSWORD_LOGIN_ENABLED` ist deaktiviert
- **WHEN** ein Client `POST /api/auth/login/` mit E-Mail und Passwort sendet
- **THEN** antwortet das System mit HTTP 404 und es wird keine Session erzeugt
