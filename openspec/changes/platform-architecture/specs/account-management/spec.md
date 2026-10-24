# Spec Delta: account-management

## ADDED Requirements

### Requirement: Kontobereich in der Konto-App
Die Konto-App SHALL eine Seite „Konto & Anmeldung“ (`konto.gruppenstunde.de/account`) bereitstellen; Produkt-Apps SHALL keine eigene Kontoseite haben und `/profile/account` dorthin weiterleiten. Die Seite SHALL zeigen: E-Mail-Adresse (immer als Anmeldeweg), verknüpfte Anbieter (`GET /api/auth/connections/`) mit „Verbinden“ und „Trennen“, KI-Kontingent, „Abmelden“ und den Link zu Datenschutz. `SocialConnectionOut` und `socialConnectionSchema` SHALL synchron sein.

#### Scenario: Zweiten Anbieter verbinden
- **GIVEN** ein Nutzer ist nur mit Google verknüpft
- **WHEN** er „Mit Apple verbinden“ wählt und zustimmt
- **THEN** zeigt `/account` der Konto-App Google und Apple

#### Scenario: Letzten Anbieter trennen
- **GIVEN** ein Nutzer hat nur Google verknüpft
- **WHEN** er `DELETE /api/auth/connections/{id}/` mit frischer Anmeldung aufruft
- **THEN** antwortet das System mit HTTP 204
- **AND** die Seite zeigt „Du kannst dich weiterhin per E-Mail-Link mit max@example.org anmelden.“

#### Scenario: Anonymer Zugriff auf Verknüpfungen
- **WHEN** ein nicht angemeldeter Client `GET /api/auth/connections/` aufruft
- **THEN** antwortet das System mit HTTP 401 und `code: "auth_required"`

#### Scenario: Fremde Verknüpfung trennen
- **WHEN** ein Nutzer `DELETE /api/auth/connections/{id}/` mit der ID eines fremden Social-Accounts aufruft
- **THEN** antwortet das System mit HTTP 404

#### Scenario: Kontoseite aus einer Produkt-App
- **WHEN** ein Nutzer `gruppenstunde.de/profile/account` öffnet
- **THEN** wird er auf `konto.gruppenstunde.de/account` mit Rücksprung zu Gruppenstunde weitergeleitet

### Requirement: E-Mail-Adresse ändern
Ein Nutzer SHALL seine E-Mail-Adresse in der Konto-App ändern können (`POST /api/account/email-change/` mit `{ email }`). Die neue Adresse MUST erst gelten, nachdem der Link in einer Bestätigungsmail an die neue Adresse geöffnet und bestätigt wurde. Die alte Adresse SHALL eine Benachrichtigung erhalten. Die Aktion SHALL eine frische Anmeldung verlangen. Ist die neue Adresse schon vergeben, SHALL dieselbe Antwort wie bei Erfolg erscheinen, ohne Bestätigungsmail.

#### Scenario: Adresse ändern
- **GIVEN** ein frisch angemeldeter Nutzer mit `alt@example.org`
- **WHEN** er `neu@example.org` einträgt und den Link in der Mail an `neu@example.org` bestätigt
- **THEN** meldet er sich ab jetzt per E-Mail-Link mit `neu@example.org` an
- **AND** an `alt@example.org` ging der Hinweis „Deine E-Mail-Adresse bei Inspi wurde geändert.“

#### Scenario: Ohne frische Anmeldung
- **GIVEN** die Anmeldung des Nutzers liegt mehr als 15 Minuten zurück
- **WHEN** er `POST /api/account/email-change/` aufruft
- **THEN** antwortet das System mit HTTP 401 und `code: "reauth_required"`

#### Scenario: Anonym
- **WHEN** ein nicht angemeldeter Client `POST /api/account/email-change/` aufruft
- **THEN** antwortet das System mit HTTP 401 und `code: "auth_required"`

## REMOVED Requirements

### Requirement: Kontobereich „Konto & Anmeldung“
**Reason**: Ersetzt durch „Kontobereich in der Konto-App“. Die Seite zieht von `/profile/account` der Produkt-Apps in die Konto-App, Microsoft und Facebook entfallen, und das Trennen des letzten Anbieters ist erlaubt, weil der E-Mail-Link immer als Anmeldeweg bleibt.
**Migration**: `/profile/account` der Produkt-Apps leitet auf `konto.gruppenstunde.de/account` weiter. Der Fehlercode `last_connection` entfällt; Frontends entfernen seine Behandlung.
