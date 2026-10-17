# auth-session Specification

## Purpose

Session-basierte Authentifizierung mit HTTP-only Cookies und iOS-kompatiblen Cookie-Einstellungen (SameSite=Lax). CSRF-Token schützen den Social-Login-Start; die JSON-API unter `/api/` erzwingt kein CSRF-Token.
## Requirements
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

#### Scenario: Passwort-Login über die API ist nicht möglich

- **GIVEN** `AUTH_PASSWORD_LOGIN_ENABLED` ist deaktiviert
- **WHEN** ein Client `POST /api/auth/login/` mit E-Mail und Passwort sendet
- **THEN** antwortet das System mit HTTP 404 und es wird keine Session erzeugt

### Requirement: iOS-Kompatibilität

Session-Cookies SHALL mit SameSite=Lax gesetzt werden, damit iOS WebKit (Chrome/Safari) die Cookies akzeptiert. iOS blockiert Third-Party-Cookies — die Session darf nicht auf Cross-Origin-Cookies angewiesen sein.

#### Scenario: Login auf iOS

- **GIVEN** ein User auf iOS (Chrome oder Safari)
- **WHEN** der User sich auf `essensplan.app` oder `gruppenstunde.de` anmeldet
- **THEN** wird die Session-Cookie vom Browser akzeptiert (nicht als Third-Party blockiert)
- **AND** Folgerequests sind authentifiziert

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

### Requirement: Eingeloggte Nutzer sehen keine Anmeldeaufforderung
`/login` und `/register` SHALL eingeloggte Nutzer auf das `next`-Ziel oder die Startseite weiterleiten (außer im Re-Auth-Modus). Tool-Landingpages MUST keinen Anmelde-Button für eingeloggte Nutzer anzeigen.

#### Scenario: Eingeloggt auf /login
- **WHEN** ein eingeloggter Nutzer `/login` öffnet
- **THEN** wird er weitergeleitet

#### Scenario: Landingpage eingeloggt
- **WHEN** ein eingeloggter Nutzer `/meal-plans` öffnet
- **THEN** fehlt der Button „Kostenlos anmelden“

#### Scenario: Re-Auth
- **WHEN** die Sitzung eine erneute Anmeldung verlangt
- **THEN** bleibt das Anmeldeformular erreichbar

### Requirement: Eine überlastete Anmeldeprüfung ist keine Abmeldung
Die Food-Frontend-Anwendung SHALL die Anmeldeprüfung `GET /api/auth/me/` bei Überlastung (429), Serverfehlern (5xx) oder Netzfehlern wiederholen, bevor sie einen Nutzer als abgemeldet behandelt. Die Anmeldeaufforderung MUST nur bei `is_authenticated: false` oder HTTP 401 erscheinen.

#### Scenario: Kurze Überlastung meldet niemanden ab
- **GIVEN** ein angemeldeter Nutzer öffnet eine Einkaufsliste
- **WHEN** die ersten beiden Anmeldeprüfungen HTTP 429 liefern und die dritte erfolgreich ist
- **THEN** sieht der Nutzer die Liste
- **AND** die Anmeldeaufforderung erscheint nicht

#### Scenario: Dauerhafte Überlastung zeigt eine Wiederholung
- **GIVEN** alle Anmeldeprüfungen liefern HTTP 429
- **WHEN** die Wiederholungen erschöpft sind
- **THEN** zeigt die Seite „Anmeldung gerade nicht prüfbar“ mit „Erneut versuchen“
- **AND** nicht die Anmeldeaufforderung

#### Scenario: Erneut versuchen nach Überlastung
- **GIVEN** die Seite zeigt „Anmeldung gerade nicht prüfbar“
- **WHEN** der Nutzer „Erneut versuchen“ wählt und die Prüfung gelingt
- **THEN** erscheint die Liste

#### Scenario: Echte Abmeldung bleibt erkennbar
- **WHEN** `GET /api/auth/me/` eine Antwort mit `is_authenticated: false` liefert
- **THEN** zeigt die Seite die Anmeldeaufforderung

#### Scenario: Gast bleibt auf der Liste
- **GIVEN** ein Gast besitzt ein gültiges Gast-Token
- **WHEN** die Anmeldeprüfung fehlschlägt
- **THEN** bleibt die Liste sichtbar
