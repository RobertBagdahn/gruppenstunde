# Spec Delta: social-login

## ADDED Requirements

### Requirement: Anmeldung per Google, Apple oder E-Mail-Link
Das System SHALL Nutzer über die OAuth-Anbieter Google und Apple via `django-allauth` anmelden. Zusätzlich SHALL die Anmeldung per E-Mail-Link und Code möglich sein (`email-login`). Ein Anbieter SHALL nur angeboten werden, wenn für ihn Client-Zugangsdaten konfiguriert sind. Es SHALL keine Anmeldung und keine Registrierung mit Passwort geben, außer dem Admin-Notfallzugang.

#### Scenario: Anbieterliste abrufen (anonym)
- **GIVEN** Google und Apple sind konfiguriert
- **WHEN** ein nicht angemeldeter Besucher `GET /api/auth/providers/` aufruft
- **THEN** antwortet das System mit HTTP 200 und `{ providers: [{ id: "google", … }, { id: "apple", … }], email_login: true, dev_login: false }`

#### Scenario: Passwort-Endpunkte existieren nicht
- **WHEN** ein Client `POST /api/auth/login/` oder `POST /api/auth/register/` aufruft
- **THEN** antwortet das System mit HTTP 404

#### Scenario: Früherer Microsoft-Nutzer
- **GIVEN** ein Konto `anna@example.org`, das bisher nur mit Microsoft verknüpft war
- **WHEN** Anna sich per E-Mail-Link mit `anna@example.org` anmeldet
- **THEN** ist sie in ihrem bisherigen Konto mit allen Inhalten angemeldet

#### Scenario: Früheres Passwort-Konto
- **GIVEN** ein Konto `alt@example.org` mit Passwort
- **WHEN** der Nutzer sich per E-Mail-Link mit `alt@example.org` anmeldet
- **THEN** ist er in seinem bisherigen Konto angemeldet

### Requirement: Kontoanlage und Verknüpfung über bestätigte E-Mail
Beim ersten Login mit Google oder Apple SHALL das System ohne weiteres Formular ein Konto mit `UserProfile` anlegen und Vor- und Nachname des Anbieters vorbelegen. Gehört die vom Anbieter als bestätigt gemeldete E-Mail bereits einem Konto, SHALL das System den Anbieter mit diesem Konto verbinden und anmelden. Meldet der Anbieter die E-Mail als nicht bestätigt und gehört sie bereits einem Konto, MUST das System nicht verknüpfen.

#### Scenario: Neuer Nutzer
- **WHEN** sich eine unbekannte Person erstmals mit Google anmeldet
- **THEN** werden `User` und `UserProfile` angelegt
- **AND** die Session-Antwort enthält `needs_onboarding: true`

#### Scenario: Bestehendes E-Mail-Konto meldet sich mit Google an
- **GIVEN** ein Konto `max@example.org`, das bisher nur per E-Mail-Link genutzt wurde
- **WHEN** Max sich mit Google und der bestätigten Adresse `max@example.org` anmeldet
- **THEN** ist er in seinem bestehenden Konto angemeldet
- **AND** „Konto & Anmeldung“ zeigt Google als verknüpft

#### Scenario: Nicht bestätigte E-Mail kollidiert
- **WHEN** ein Anbieter eine nicht bestätigte E-Mail liefert, die bereits einem Konto gehört
- **THEN** leitet das System auf `/login?error=email_conflict` weiter, mit der Meldung „Zu dieser E-Mail gibt es schon ein Konto. Melde dich per E-Mail-Link an und verbinde den Anbieter danach unter ‚Konto & Anmeldung‘.“

## MODIFIED Requirements

### Requirement: Getrennte Sessions pro Domain

Jede App-Domain (`konto.gruppenstunde.de`, `gruppenstunde.de`, die Anmelde-Domain und `essensplan.app`) SHALL eine eigene Session führen. Die OAuth-Callback-URL SHALL auf der Domain liegen, auf der der Login gestartet wurde (`https://<domain>/api/accounts/<provider>/login/callback/`). Das Backend SHALL den ursprünglichen Host über `X-Forwarded-Host` des Frontend-Proxys ermitteln. Die Sessions der Domains SHALL über den Plattform-Abgleich (`platform-sso`) verbunden werden, damit ein Wechsel keine erneute Anbieterauswahl erfordert.

#### Scenario: Login auf essensplan.app
- **WHEN** ein Besucher den Google-Login auf `essensplan.app` startet
- **THEN** lautet die Redirect-URI `https://essensplan.app/api/accounts/google/login/callback/`
- **AND** das Session-Cookie wird für `essensplan.app` gesetzt

#### Scenario: Keine domainübergreifende Session
- **GIVEN** ein Nutzer ist auf `gruppenstunde.de` angemeldet
- **WHEN** er über den App-Switcher `essensplan.app` öffnet
- **THEN** wird das Session-Cookie von `gruppenstunde.de` nicht an `essensplan.app` gesendet
- **AND** `essensplan.app` erhält über den Plattform-Abgleich ein eigenes Session-Cookie, ohne dass der Nutzer einen Anbieter auswählt

#### Scenario: Ohne Plattform-Abgleich
- **GIVEN** die zentrale Anmeldung ist in diesem Browser nicht mehr vorhanden, z. B. weil der Browser die Daten gelöscht hat
- **WHEN** ein auf `gruppenstunde.de` angemeldeter Nutzer `essensplan.app` öffnet und „Anmelden“ wählt
- **THEN** sieht er die Login-Seite des Essensplans und kann sich mit einem Klick beim selben Anbieter anmelden

## REMOVED Requirements

### Requirement: Ausschließlich Social Login
**Reason**: Ersetzt durch „Anmeldung per Google, Apple oder E-Mail-Link“. Microsoft und Facebook entfallen, die Übergangszeit mit Passwort-Login endet, und die passwortlose Anmeldung per E-Mail kommt hinzu.
**Migration**: Nutzer mit Passwort-, Microsoft- oder Facebook-Konto melden sich per E-Mail-Link mit derselben Adresse an und landen in ihrem bestehenden Konto. `AUTH_PASSWORD_LOGIN_ENABLED` wird entfernt, ebenso die Konfiguration für Microsoft und Facebook. Bestehende `SocialAccount`-Einträge dieser Anbieter bleiben erhalten, bis der Nutzer sie trennt.

### Requirement: Automatische Kontoanlage und -verknüpfung
**Reason**: Die Sperre gegen automatische Verknüpfung schützte Passwörter vor stillem Zurücksetzen durch Allauth. Ohne Passwort-Konten entfällt dieser Grund, und eine vom Anbieter bestätigte E-Mail beweist den Besitz der Adresse genauso wie ein E-Mail-Link.
**Migration**: Ersetzt durch „Kontoanlage und Verknüpfung über bestätigte E-Mail“. `SOCIALACCOUNT_EMAIL_AUTHENTICATION` und `SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT` werden aktiviert, nur für bestätigte E-Mails.
