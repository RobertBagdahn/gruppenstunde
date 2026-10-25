# Spec Delta: email-login

## Purpose

Ermöglicht Anmeldung und Kontoanlage nur mit einer E-Mail-Adresse, ohne Passwort: Das System schickt einen Anmeldelink und einen sechsstelligen Code. Eine so entstandene Anmeldung gilt fest vier Stunden lang.

## ADDED Requirements

### Requirement: Anmeldung per E-Mail anfordern
Jede App SHALL auf ihrer Login-Seite ein Feld „E-Mail-Adresse“ mit „Anmeldelink senden“ anbieten (`POST /api/auth/email-login/` mit `{ email, next }`). Das System SHALL unabhängig davon, ob ein Konto existiert, mit HTTP 202 und derselben Meldung antworten: „Wir haben dir eine E-Mail geschickt. Öffne den Link oder gib den Code hier ein.“ `next` SHALL nur relative Pfade der eigenen Domain akzeptieren.

#### Scenario: Bekannte Adresse
- **GIVEN** ein Konto mit `max@example.org`
- **WHEN** ein nicht angemeldeter Besucher im Essensplan `max@example.org` eingibt
- **THEN** antwortet das System mit HTTP 202 und der Meldung
- **AND** an `max@example.org` geht eine E-Mail im Namen und Design des Essensplans

#### Scenario: Unbekannte Adresse
- **WHEN** ein Besucher eine Adresse eingibt, zu der es kein Konto gibt
- **THEN** antwortet das System mit genau derselben HTTP-202-Antwort
- **AND** die E-Mail bietet die Anlage eines neuen Kontos an

#### Scenario: Ungültige Adresse
- **WHEN** ein Besucher `max@` eingibt
- **THEN** antwortet das System mit HTTP 422 und „Bitte gib eine gültige E-Mail-Adresse ein.“

### Requirement: Anmelde-E-Mail mit Link und Code
Die E-Mail SHALL einen Anmeldelink auf die Domain der anfragenden App und einen sechsstelligen Code enthalten. Link und Code SHALL zur selben Anfrage gehören, 15 Minuten gültig und insgesamt nur einmal verwendbar sein. Eine neue Anfrage für dieselbe Adresse SHALL ältere, unbenutzte Anfragen ungültig machen.

#### Scenario: Code nach Verwendung des Links
- **GIVEN** ein Nutzer hat sich über den Link angemeldet
- **WHEN** jemand danach den Code derselben E-Mail eingibt
- **THEN** wird er nicht angemeldet und sieht „Dieser Code ist nicht mehr gültig. Fordere einen neuen an.“

#### Scenario: Abgelaufener Link
- **WHEN** ein Nutzer den Link nach mehr als 15 Minuten öffnet
- **THEN** sieht er „Dieser Link ist abgelaufen. Fordere einen neuen an.“ mit dem E-Mail-Feld

#### Scenario: Neue Anfrage ersetzt alte
- **GIVEN** ein Nutzer hat zwei Anmeldemails nacheinander angefordert
- **WHEN** er den Link aus der ersten E-Mail öffnet
- **THEN** wird er nicht angemeldet und sieht den Hinweis auf den abgelaufenen Link

### Requirement: Link meldet das öffnende Gerät an
Das Öffnen des Links SHALL eine Bestätigungsseite der App mit „Jetzt anmelden“ zeigen. Erst der Klick SHALL anmelden (`POST /api/auth/email-login/confirm/` mit `{ token }`). Das reine Öffnen der URL MUST NOT anmelden und den Link nicht verbrauchen, damit Link-Vorschauen von Mailprogrammen ihn nicht entwerten.

#### Scenario: Anmeldung per Link
- **WHEN** ein Nutzer den Link öffnet und „Jetzt anmelden“ wählt
- **THEN** ist er in diesem Browser angemeldet und landet auf `next`

#### Scenario: Mailprogramm lädt den Link vor
- **GIVEN** ein Sicherheitsfilter des Mailprogramms ruft den Link einmal per GET auf
- **WHEN** der Nutzer den Link danach selbst öffnet und bestätigt
- **THEN** ist er angemeldet

### Requirement: Code meldet das anfragende Gerät an
Auf dem Gerät, auf dem die E-Mail angefordert wurde, SHALL die App nach dem Absenden ein Feld für den sechsstelligen Code zeigen (`POST /api/auth/email-login/verify-code/` mit `{ code }`). Ein Code MUST nur in dem Browser gelten, der die Anfrage gestellt hat. Nach fünf falschen Eingaben MUST die Anfrage ungültig werden.

#### Scenario: Laptop anfragen, Code vom Handy abtippen
- **GIVEN** ein Besucher fordert am Laptop eine Anmeldemail an und öffnet sie am Handy
- **WHEN** er den Code am Laptop eingibt
- **THEN** ist er am Laptop angemeldet und landet auf `next`

#### Scenario: Code in fremdem Browser
- **WHEN** jemand einen gültigen Code in einem Browser eingibt, der die Anfrage nicht gestellt hat
- **THEN** antwortet das System mit HTTP 400 und `code: "email_login_invalid"`

#### Scenario: Zu viele Fehlversuche
- **WHEN** ein Besucher fünfmal einen falschen Code eingibt
- **THEN** ist auch der richtige Code danach ungültig und die App bittet, einen neuen anzufordern

### Requirement: Konto per E-Mail anlegen
Gibt es zur bestätigten Adresse kein Konto, SHALL das System nach Bestätigung per Link oder Code ein Konto mit `UserProfile` anlegen und `needs_onboarding: true` liefern. Es gibt kein Passwort. Existiert zur Adresse nur ein Gast-Konto aus einer Aktionsanmeldung, SHALL dieses zu einem vollwertigen Konto werden, inklusive seiner Anmeldungen.

#### Scenario: Neues Konto
- **WHEN** eine unbekannte Person ihre Adresse per Link bestätigt
- **THEN** werden `User` und `UserProfile` angelegt und das Onboarding erscheint

#### Scenario: Gast wird Konto
- **GIVEN** ein Elternteil hat sein Kind als Gast mit `eltern@example.org` angemeldet
- **WHEN** es sich später per E-Mail-Link mit `eltern@example.org` anmeldet
- **THEN** sieht es die Anmeldung seines Kindes unter „Meine Anmeldungen“

### Requirement: E-Mail-Anmeldung gilt vier Stunden
Eine per Link oder Code entstandene Anmeldung SHALL genau vier Stunden nach der Bestätigung enden, unabhängig von der Nutzung. Danach SHALL jede App beim nächsten API-Aufruf HTTP 401 mit `code: "session_expired"` erhalten und ihre Login-Seite mit „Deine Anmeldung ist abgelaufen. Melde dich bitte neu an.“ zeigen. `GET /api/auth/me/` SHALL `auth_method` (`email`, `google`, `apple`) und `expires_at` liefern.

#### Scenario: Ablauf nach vier Stunden
- **GIVEN** ein Nutzer hat sich um 10:00 per E-Mail-Link angemeldet und arbeitet durchgehend
- **WHEN** er um 14:01 speichert
- **THEN** antwortet das System mit HTTP 401 und `code: "session_expired"`

#### Scenario: Session-Antwort
- **WHEN** ein per E-Mail angemeldeter Nutzer `GET /api/auth/me/` aufruft
- **THEN** enthält die Antwort `auth_method: "email"` und `expires_at` vier Stunden nach der Anmeldung

#### Scenario: Ungespeicherte Eingaben
- **GIVEN** ein Nutzer bearbeitet ein Formular, als seine Anmeldung abläuft
- **WHEN** er speichert und sich über den Hinweis neu anmeldet
- **THEN** wird ihm danach der gesicherte Entwurf angeboten, soweit die Seite Entwürfe sichert

### Requirement: Schutz vor Missbrauch
Das System SHALL Anmeldemails pro Adresse auf 5 pro Stunde und pro Absender-Netz auf 20 pro Stunde begrenzen und darüber mit HTTP 429 und `code: "rate_limited"` antworten („Du hast zu viele Anmeldemails angefordert. Versuche es in einer Stunde wieder.“). IP-Adressen MUST dafür nur gehasht gespeichert werden. Tokens und Codes MUST nur als Hash gespeichert werden.

#### Scenario: Zu viele Anfragen
- **WHEN** für `max@example.org` innerhalb einer Stunde die sechste Anmeldemail angefordert wird
- **THEN** antwortet das System mit HTTP 429 und es wird keine E-Mail versendet
