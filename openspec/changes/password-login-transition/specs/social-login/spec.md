## MODIFIED Requirements

### Requirement: Ausschließlich Social Login

Das System SHALL Nutzer über OAuth-Anbieter via `django-allauth` (`allauth.socialaccount`) anmelden. Unterstützte Anbieter SHALL Google, Apple, Microsoft und Facebook sein. Ein Anbieter SHALL nur angeboten werden, wenn für ihn Client-Zugangsdaten konfiguriert sind. Während einer Übergangszeit SHALL zusätzlich die Anmeldung und Registrierung mit E-Mail und Passwort möglich sein, solange `AUTH_PASSWORD_LOGIN_ENABLED` aktiv ist (Standard: aktiv). Ist der Schalter deaktiviert, SHALL es keinen API-Endpunkt für Anmeldung oder Registrierung mit E-Mail und Passwort geben. Instagram SHALL NOT angeboten werden.

#### Scenario: Anbieterliste abrufen (anonym)
- **GIVEN** Google und Microsoft sind konfiguriert, Apple und Facebook nicht, und die Übergangszeit ist aktiv
- **WHEN** ein nicht angemeldeter Besucher `GET /api/auth/providers/` aufruft
- **THEN** antwortet das System mit HTTP 200 und `{ providers: [{ id: "google", … }, { id: "microsoft", … }], dev_login: false, password_login: true }`

#### Scenario: Passwort-Login existiert nicht mehr
- **GIVEN** `AUTH_PASSWORD_LOGIN_ENABLED` ist deaktiviert
- **WHEN** ein Client `POST /api/auth/login/` oder `POST /api/auth/register/` aufruft
- **THEN** antwortet das System mit HTTP 404

#### Scenario: Allauth-Passwortformulare sind deaktiviert
- **WHEN** ein Client die Allauth-Seiten für Passwort-Login oder -Registrierung aufruft
- **THEN** SHALL keine Anmeldung oder Kontoerstellung über diese Allauth-Seiten möglich sein

#### Scenario: Bestehendes Passwort-Konto in der Übergangszeit
- **GIVEN** die Übergangszeit ist aktiv und ein Konto mit `alt@example.org` und Passwort existiert
- **WHEN** der Nutzer `POST /api/auth/login/` mit korrekten Zugangsdaten aufruft
- **THEN** wird eine Session gesetzt und das System antwortet mit HTTP 200 und den Nutzerdaten

#### Scenario: Falsches Passwort in der Übergangszeit
- **WHEN** ein Nutzer ein falsches Passwort angibt
- **THEN** antwortet das System mit HTTP 400, `code: "invalid_credentials"` und „E-Mail-Adresse oder Passwort ist falsch.“

#### Scenario: Registrierung mit E-Mail in der Übergangszeit
- **WHEN** ein Besucher `POST /api/auth/register/` mit gültiger E-Mail und zwei gleichen, ausreichend starken Passwörtern aufruft
- **THEN** werden `User` und `UserProfile` angelegt, der Besucher ist angemeldet und erhält HTTP 201 mit `needs_onboarding: true`
- **AND** bei bereits vergebener E-Mail antwortet das System mit HTTP 400 und `code: "email_taken"`, bei schwachem Passwort mit `code: "weak_password"`
