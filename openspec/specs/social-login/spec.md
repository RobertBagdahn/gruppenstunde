# social-login Specification

## Purpose
TBD - created by archiving change social-login-open-access. Update Purpose after archive.
## Requirements
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

### Requirement: Login-Flow mit sicherem Rücksprung

Der Login SHALL per Formular-POST (mit CSRF-Token) an die Anbieter-Login-URL unter `/api/accounts/<provider>/login/` starten, mit einem `next`-Parameter. Nach erfolgreicher Anmeldung SHALL das System eine Django-Session setzen (HTTP-only-Cookie) und auf `next` weiterleiten. `next` SHALL nur relative Pfade derselben Domain akzeptieren; alles andere SHALL auf `/` zurückfallen. GET-Aufrufe der Login-URL SHALL keinen OAuth-Flow starten.

#### Scenario: Erfolgreicher Google-Login
- **GIVEN** ein nicht angemeldeter Besucher auf `/recipes/new`
- **WHEN** er „Mit Google anmelden“ wählt und bei Google zustimmt
- **THEN** wird ein Session-Cookie gesetzt
- **AND** der Besucher landet wieder auf `/recipes/new`

#### Scenario: Offener Redirect wird verhindert
- **WHEN** der Login mit `next=https://evil.example/` gestartet wird
- **THEN** leitet das System nach erfolgreicher Anmeldung auf `/` weiter

#### Scenario: Nutzer bricht beim Anbieter ab
- **WHEN** der Nutzer die Zustimmung beim Anbieter abbricht oder der Anbieter einen Fehler meldet
- **THEN** leitet das System auf `/login?error=<code>&next=<next>` weiter
- **AND** die Login-Seite zeigt eine deutsche Meldung, z. B. „Die Anmeldung wurde abgebrochen. Du kannst es jederzeit erneut versuchen.“

#### Scenario: Anbieter liefert keine E-Mail-Adresse
- **WHEN** der Anbieter keine E-Mail-Adresse freigibt
- **THEN** leitet das System auf `/login?error=email_missing` weiter
- **AND** die Meldung lautet „Wir brauchen deine E-Mail-Adresse, um dein Konto anzulegen. Bitte erlaube den Zugriff darauf beim Anbieter.“

### Requirement: Automatische Kontoanlage und -verknüpfung

Beim ersten Social Login SHALL das System ohne weiteres Formular automatisch ein Konto anlegen (`auto signup`). Social Accounts SHALL NOT automatisch mit bestehenden lokalen Konten per E-Mail verknüpft oder zur Authentifizierung verwendet werden, damit Allauth ein bestehendes Passwort nicht unbemerkt ungültig macht. Hat die beim Anbieter verwendete E-Mail bereits ein lokales Konto, SHALL das System auf `/login?error=email_conflict` leiten. Der Nutzer kann sich mit seinem bestehenden Login anmelden und den Anbieter danach im authentifizierten Konto-Bereich explizit verbinden. Beim Anlegen eines neuen Social-Kontos SHALL ein `UserProfile` erzeugt und mit Vor- und Nachname des Anbieters vorbelegt werden.

#### Scenario: Bestehender Nutzer meldet sich erstmals mit Google an
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

#### Scenario: Nicht verifizierte E-Mail kollidiert
- **WHEN** ein Anbieter eine nicht verifizierte E-Mail liefert, die bereits existiert
- **THEN** SHALL das System nicht automatisch verknüpfen
- **AND** es leitet auf `/login?error=email_conflict` weiter, mit der Meldung „Zu dieser E-Mail gibt es schon ein Konto. Melde dich mit dem Anbieter an, den du bisher genutzt hast.“

#### Scenario: Social E-Mail eines bestehenden Kontos wird nicht verknüpft
- **WHEN** ein Social-Anbieter eine E-Mail-Adresse liefert, die bereits einem lokalen Konto gehört
- **THEN** SHALL das System nicht automatisch verknüpfen oder anmelden
- **AND** es leitet auf `/login?error=email_conflict` weiter

### Requirement: Session-Endpunkt

`GET /api/auth/me/` SHALL immer mit HTTP 200 antworten, und zwar mit `{ is_authenticated: bool, user: UserOut | null }`. `UserOut` SHALL `id`, `email`, `first_name`, `last_name`, `display_name`, `is_staff`, `is_superuser`, `needs_onboarding` und `providers: string[]` enthalten.

#### Scenario: Anonymer Besucher
- **WHEN** ein nicht angemeldeter Besucher `GET /api/auth/me/` aufruft
- **THEN** antwortet das System mit HTTP 200 und `{ is_authenticated: false, user: null }`

#### Scenario: Angemeldeter Nutzer
- **WHEN** eine angemeldete Nutzerin `GET /api/auth/me/` aufruft
- **THEN** antwortet das System mit HTTP 200, `is_authenticated: true` und ihren Nutzerdaten inklusive `providers: ["google"]`

### Requirement: Abmelden

`POST /api/auth/logout/` SHALL die Session beenden und mit HTTP 200 antworten, auch wenn keine Session bestand. Das Frontend SHALL danach den Auth-Cache leeren, nutzerspezifische Query-Caches invalidieren und den Nutzer auf der aktuellen Seite belassen, sofern diese öffentlich ist, sonst auf `/` weiterleiten.

#### Scenario: Abmelden von einer öffentlichen Seite
- **GIVEN** ein angemeldeter Nutzer auf einer öffentlichen Rezeptseite
- **WHEN** er „Abmelden“ wählt
- **THEN** bleibt er auf der Rezeptseite, jetzt ohne Bearbeiten-Aktionen
- **AND** ein Toast „Du bist abgemeldet.“ erscheint

#### Scenario: Abmelden ohne Session
- **WHEN** ein nicht angemeldeter Client `POST /api/auth/logout/` aufruft
- **THEN** antwortet das System mit HTTP 200

### Requirement: Dev-Login nur außerhalb der Produktion

Das System SHALL `POST /api/auth/dev-login/` mit `{ email }` nur bereitstellen, wenn `AUTH_DEV_LOGIN_ENABLED` aktiv ist (lokal und in Tests). Die Produktionskonfiguration SHALL beim Start fehlschlagen, wenn `AUTH_DEV_LOGIN_ENABLED` aktiv ist. Ist der Dev-Login deaktiviert, SHALL der Endpunkt HTTP 404 liefern.

#### Scenario: E2E-Test meldet sich an
- **GIVEN** Test-Settings mit `AUTH_DEV_LOGIN_ENABLED=True`
- **WHEN** das E2E-Fixture `POST /api/auth/dev-login/` mit `{ "email": "user@inspi.dev" }` aufruft
- **THEN** ist die Session für diesen Nutzer aktiv

#### Scenario: Produktion ohne Dev-Login
- **WHEN** in Produktion `POST /api/auth/dev-login/` aufgerufen wird
- **THEN** antwortet das System mit HTTP 404

### Requirement: Admin-Notfallzugang per Passwort

Die Django-Admin-Oberfläche `/admin/` SHALL weiterhin den Passwort-Login für Nutzer mit `is_staff=True` anbieten. Dieser Passwort-Login SHALL keine Session für die API-Frontends begründen, die über den normalen API-Weg zustande kommt, und SHALL nicht über die Frontends erreichbar sein.

#### Scenario: Superuser nutzt den Notfallzugang
- **WHEN** ein Superuser sich unter `/admin/` mit Passwort anmeldet
- **THEN** erhält er Zugang zur Django-Admin-Oberfläche

### Requirement: Getrennte Sessions pro Domain

`gruppenstunde.de` und `essensplan.app` SHALL unabhängige Sessions führen. Die OAuth-Callback-URL SHALL auf der Domain liegen, auf der der Login gestartet wurde (`https://<domain>/api/accounts/<provider>/login/callback/`). Das Backend SHALL den ursprünglichen Host über `X-Forwarded-Host` des Frontend-Proxys ermitteln.

#### Scenario: Login auf essensplan.app
- **WHEN** ein Besucher den Google-Login auf `essensplan.app` startet
- **THEN** lautet die Redirect-URI `https://essensplan.app/api/accounts/google/login/callback/`
- **AND** das Session-Cookie wird für `essensplan.app` gesetzt

#### Scenario: Keine domainübergreifende Session
- **GIVEN** ein Nutzer ist auf `gruppenstunde.de` angemeldet
- **WHEN** er `essensplan.app` öffnet
- **THEN** ist er dort nicht angemeldet und kann sich mit einem Klick beim selben Anbieter anmelden

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
