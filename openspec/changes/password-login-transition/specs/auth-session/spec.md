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

### Requirement: CSRF-Cookie mit SameSite=Lax

CSRF-Cookies SHALL in der Produktion `SameSite=Lax` verwenden. Der Social-Login-Start SHALL als Formular-POST mit CSRF-Token an die Allauth-View erfolgen, die `CsrfViewMiddleware` prüft. Die JSON-API unter `/api/` (Django Ninja, einschließlich `POST /api/auth/login/` und `POST /api/auth/register/`) SHALL kein CSRF-Token erzwingen. Der Schutz gegen Cross-Site-Requests beruht dort darauf, dass das Session-Cookie mit `SameSite=Lax` bei Cross-Site-POSTs nicht mitgesendet wird, und auf der CORS-Allowlist mit `CORS_ALLOW_CREDENTIALS` nur für die eigenen Frontends (Entscheidung vom 2026-10-11).

#### Scenario: CSRF-Schutz bei Login

- **GIVEN** der Besucher hat eine Seite geladen (CSRF-Cookie gesetzt über `GET /api/auth/csrf/`)
- **WHEN** der Besucher auf „Mit Google anmelden“ klickt
- **THEN** sendet das Frontend einen Formular-POST an `/api/accounts/google/login/` mit `csrfmiddlewaretoken` und `next`
- **AND** der Server validiert das Token und leitet zum Anbieter weiter

#### Scenario: Login-Start ohne CSRF-Token

- **WHEN** ein Formular-POST an `/api/accounts/google/login/` ohne gültiges CSRF-Token eingeht
- **THEN** antwortet das System mit HTTP 403 und startet keinen OAuth-Flow

#### Scenario: API-Request ohne CSRF-Token

- **GIVEN** ein angemeldeter Nutzer im eigenen Frontend
- **WHEN** das Frontend einen schreibenden Request an `/api/` ohne `X-CSRFToken` sendet
- **THEN** verarbeitet das System den Request ohne CSRF-Prüfung

#### Scenario: Cross-Site-POST einer fremden Seite

- **GIVEN** ein angemeldeter Nutzer besucht eine fremde Website
- **WHEN** diese Seite einen POST an einen geschützten `/api/`-Endpunkt auslöst
- **THEN** sendet der Browser das Session-Cookie wegen `SameSite=Lax` nicht mit
- **AND** das System behandelt den Request als anonym und führt keine Änderung im Namen des Nutzers aus
