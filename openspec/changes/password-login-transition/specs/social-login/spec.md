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

### Requirement: Automatische Kontoanlage und -verknüpfung

Beim ersten Social Login SHALL das System ohne weiteres Formular automatisch ein Konto anlegen (`auto signup`). Social Accounts SHALL NOT automatisch mit bestehenden lokalen Konten per E-Mail verknüpft oder zur Authentifizierung verwendet werden, damit Allauth ein bestehendes Passwort nicht unbemerkt ungültig macht. Hat die beim Anbieter verwendete E-Mail bereits ein lokales Konto, SHALL das System auf `/login?error=email_conflict` leiten. Der Nutzer kann sich mit seinem bestehenden Login anmelden und den Anbieter danach im authentifizierten Konto-Bereich explizit verbinden. Beim Anlegen eines neuen Social-Kontos SHALL ein `UserProfile` erzeugt und mit Vor- und Nachname des Anbieters vorbelegt werden.

#### Scenario: Bestehender Passwortnutzer meldet sich erstmals mit Google an
- **GIVEN** ein bestehendes Passwortkonto mit `max@example.org` ohne verknüpften Social Account
- **WHEN** Max sich mit einem Google-Konto mit verifizierter Adresse `max@example.org` anmeldet
- **THEN** wird das Konto nicht automatisch verknüpft
- **AND** das System leitet auf `/login?error=email_conflict` mit einer Erklärung, sich mit dem bestehenden Login anzumelden und Google anschließend im Konto-Bereich zu verbinden
- **AND** das bisherige Passwort bleibt gültig

#### Scenario: Nutzer verbindet Google nach Passwort-Login
- **GIVEN** Max ist mit seinem bestehenden Passwortkonto angemeldet
- **WHEN** er Google über „Konto & Anmeldung“ explizit verbindet
- **THEN** wird der Google-Account mit seinem bestehenden Nutzerkonto verbunden
- **AND** das Passwort bleibt gültig

#### Scenario: Neuer Nutzer
- **WHEN** sich eine unbekannte Person erstmals mit Microsoft anmeldet
- **THEN** werden `User` und `UserProfile` angelegt
- **AND** die Session-Antwort enthält `needs_onboarding: true`

#### Scenario: Social E-Mail eines bestehenden Kontos wird nicht verknüpft
- **WHEN** ein Social-Anbieter eine E-Mail-Adresse liefert, die bereits einem lokalen Konto gehört
- **THEN** SHALL das System nicht automatisch verknüpfen oder anmelden
- **AND** es leitet auf `/login?error=email_conflict` weiter

## ADDED Requirements

### Requirement: Session-Antwort bleibt während des Frontend-Rollouts rückwärtslesbar

Bis alle Frontends aktualisiert sind, SHALL `GET /api/auth/me/` zusätzlich zum neuen `{ is_authenticated, user }`-Format bei angemeldeten Nutzern die bisherigen Top-Level-Felder `id`, `email`, `first_name`, `last_name`, `is_staff` und `is_superuser` ausliefern. Diese Felder SHALL dieselben Werte wie `user` enthalten. Neue Frontends SHALL ausschließlich `user` und `is_authenticated` verwenden. Anonyme Requests SHALL weiterhin HTTP 200 mit `is_authenticated: false` und `user: null` liefern; es SHALL keine Nutzer-ID für anonyme Besucher geben.

#### Scenario: Altes Frontend liest bestehende Session während des Rollouts
- **GIVEN** ein Nutzer ist angemeldet und ein altes Frontend ruft `/api/auth/me/` auf
- **WHEN** das Backend die Session serialisiert
- **THEN** enthält die Antwort die bisherigen Top-Level-Nutzerdaten sowie `is_authenticated: true` und das neue `user`-Objekt
- **AND** beide Darstellungen enthalten dieselbe ID und E-Mail-Adresse

#### Scenario: Anonyme Antwort exponiert keine Legacy-Identität
- **WHEN** ein nicht angemeldeter Besucher `/api/auth/me/` aufruft
- **THEN** antwortet das System mit `{ is_authenticated: false, user: null }`
- **AND** `id` und `email` sind `null`
