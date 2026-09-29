## MODIFIED Requirements

### Requirement: Session-basierte Authentifizierung

Das System MUST Django-Session-Authentifizierung mit HTTP-only Cookies verwenden. JWT-Token SHALL NOT verwendet werden. Eine Session SHALL ausschließlich durch einen erfolgreichen Social Login (siehe `social-login`) oder – nur außerhalb der Produktion – durch den Dev-Login entstehen. Eine Anmeldung mit E-Mail und Passwort über die API SHALL NOT möglich sein. Sitzungen SHALL eine Laufzeit von 30 Tagen haben (`SESSION_COOKIE_AGE`), und jede Anfrage SHALL die Laufzeit verlängern (`SESSION_SAVE_EVERY_REQUEST`), damit Nutzer praktisch angemeldet bleiben.

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

#### Scenario: Passwort-Login über die API ist nicht möglich

- **WHEN** ein Client `POST /api/auth/login/` mit E-Mail und Passwort sendet
- **THEN** antwortet das System mit HTTP 404 und es wird keine Session erzeugt

### Requirement: CSRF-Cookie mit SameSite=Lax

CSRF-Cookies SHALL in der Produktion `SameSite=Lax` verwenden. Der Social-Login-Start SHALL als Formular-POST mit CSRF-Token erfolgen.

#### Scenario: CSRF-Schutz bei Login

- **GIVEN** der Besucher hat eine Seite geladen (CSRF-Cookie gesetzt über `GET /api/auth/csrf/`)
- **WHEN** der Besucher auf „Mit Google anmelden“ klickt
- **THEN** sendet das Frontend einen Formular-POST an `/api/accounts/google/login/` mit `csrfmiddlewaretoken` und `next`
- **AND** der Server validiert das Token und leitet zum Anbieter weiter

#### Scenario: Login-Start ohne CSRF-Token

- **WHEN** ein Formular-POST an `/api/accounts/google/login/` ohne gültiges CSRF-Token eingeht
- **THEN** antwortet das System mit HTTP 403 und startet keinen OAuth-Flow
