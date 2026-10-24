# Spec Delta: platform-sso

## Purpose

Ermöglicht, dass Nutzer sich in jeder App auf deren eigener Domain anmelden und beim Wechsel in eine andere App ohne erneute Anbieterauswahl angemeldet werden. Der Abgleich läuft unsichtbar über eine zentrale Domain, ohne JWT oder Third-Party-Cookies.

## ADDED Requirements

### Requirement: Login in jeder App auf ihrer eigenen Domain
Jede App (Konto, Gruppenstunde, Anmeldung, Essensplan) SHALL eine eigene Login-Seite im eigenen Erscheinungsbild auf ihrer eigenen Domain anbieten, mit „Mit Google anmelden“, „Mit Apple anmelden“ und der Anmeldung per E-Mail-Link (`email-login`). OAuth-Flow und E-Mail-Link SHALL auf dieser Domain starten und enden. Der Nutzer MUST während des Logins keine Seite einer anderen App-Domain sehen.

#### Scenario: Login im Essensplan
- **GIVEN** ein nicht angemeldeter Besucher auf `essensplan.app/recipes/new`
- **WHEN** er „Anmelden“ wählt, sich mit Google anmeldet und zustimmt
- **THEN** landet er angemeldet auf `essensplan.app/recipes/new`
- **AND** sichtbar waren nur die Login-Seite des Essensplans und die Seite von Google

#### Scenario: Login in der Anmelde-App
- **WHEN** ein Organisator sich auf der Anmelde-Domain anmeldet
- **THEN** sieht er die Login-Seite im Design der Anmelde-App und bleibt auf deren Domain

#### Scenario: E-Mail-Link führt in die anfragende App
- **WHEN** ein Besucher den E-Mail-Login in der Anmelde-App anfordert
- **THEN** zeigt der Link in der E-Mail auf die Anmelde-Domain

### Requirement: Anmeldung wird zentral hinterlegt
Nach einem erfolgreichen Login in einer App SHALL das System die Anmeldung unsichtbar per Top-Level-Weiterleitung auch auf der zentralen Domain `konto.gruppenstunde.de` hinterlegen, bevor der Nutzer sein Ziel erreicht. Schlägt das fehl, MUST der Nutzer trotzdem angemeldet in der App landen.

#### Scenario: Zentrale Anmeldung nach Login
- **GIVEN** ein Nutzer hat sich gerade im Essensplan angemeldet
- **WHEN** er danach `konto.gruppenstunde.de` öffnet
- **THEN** ist er dort angemeldet, ohne einen Anbieter auszuwählen

#### Scenario: Zentrale Domain nicht erreichbar
- **GIVEN** die zentrale Hinterlegung schlägt fehl
- **WHEN** der Login im Essensplan abgeschlossen ist
- **THEN** ist der Nutzer im Essensplan angemeldet und landet auf seinem Ziel

### Requirement: Anmeldung aus der Zentrale übernehmen
Wählt ein nicht angemeldeter Nutzer in einer App „Anmelden“, öffnet eine geschützte Seite oder wechselt über den App-Switcher, SHALL die App unsichtbar prüfen, ob die zentrale Domain eine Anmeldung kennt. Wenn ja, SHALL der Nutzer ohne Anbieterauswahl angemeldet werden. Wenn nein, SHALL er bei „Anmelden“ und geschützten Seiten die Login-Seite der App sehen und beim App-Switcher die App anonym.

#### Scenario: Wechsel mit zentraler Anmeldung
- **GIVEN** ein Nutzer ist in Gruppenstunde angemeldet, aber nicht auf `essensplan.app`
- **WHEN** er im App-Switcher „Essensplan“ wählt
- **THEN** ist er auf `essensplan.app` angemeldet, ohne einen Anbieter auszuwählen

#### Scenario: Lesezeichen und Klick auf „Anmelden“
- **GIVEN** ein Nutzer ist im Essensplan angemeldet
- **WHEN** er Gruppenstunde über ein Lesezeichen öffnet und „Anmelden“ wählt
- **THEN** ist er ohne Login-Seite und ohne Anbieterauswahl angemeldet

#### Scenario: Keine zentrale Anmeldung
- **GIVEN** ein nicht angemeldeter Besucher
- **WHEN** er in der Anmelde-App „Anmelden“ wählt
- **THEN** sieht er die Login-Seite der Anmelde-App

#### Scenario: Anonymer Seitenaufruf ohne Prüfung
- **WHEN** ein nicht angemeldeter Besucher eine öffentliche Seite einer App aufruft
- **THEN** findet keine Weiterleitung statt und die Seite wird direkt angezeigt

### Requirement: Übergaben nur auf Anfrage der empfangenden Domain
Eine Anmeldung SHALL nur dann auf eine Domain übernommen werden, wenn diese Domain die Übergabe im selben Browser selbst angestoßen hat. Übergabe-Tokens MUST höchstens 60 Sekunden gültig, einmalig einlösbar, an die empfangende Domain gebunden und nur als Hash gespeichert sein.

#### Scenario: Fremder Übergabe-Link
- **GIVEN** ein Angreifer hat einen gültigen Übergabe-Link für sein eigenes Konto erzeugt
- **WHEN** ein anderer Nutzer diesen Link öffnet
- **THEN** wird keine Anmeldung übernommen und der Nutzer bleibt in seinem bisherigen Zustand

#### Scenario: Token doppelt eingelöst
- **WHEN** ein bereits eingelöstes Übergabe-Token erneut verwendet wird
- **THEN** wird keine Session gesetzt und die App zeigt ihre Login-Seite

#### Scenario: Token auf falscher Domain
- **GIVEN** ein Token wurde für `essensplan.app` ausgestellt
- **WHEN** es auf der Domain von Gruppenstunde eingelöst wird
- **THEN** wird keine Session gesetzt

### Requirement: Laufzeit der Anmeldung gilt für alle Domains
Eine übernommene Anmeldung MUST spätestens dann enden, wenn die ursprüngliche Anmeldung endet. Eine per E-Mail-Link entstandene Anmeldung SHALL deshalb auf allen Domains, auch auf der zentralen, zum selben Zeitpunkt enden: vier Stunden nach der Bestätigung. Eine Anmeldung per Google oder Apple SHALL auf jeder Domain wie bisher 30 Tage gelten und sich bei Nutzung verlängern.

#### Scenario: E-Mail-Anmeldung in zweiter App
- **GIVEN** ein Nutzer hat sich um 10:00 im Essensplan per E-Mail-Link angemeldet
- **WHEN** er um 13:00 über den App-Switcher Gruppenstunde öffnet
- **THEN** ist er in Gruppenstunde angemeldet
- **AND** um 14:01 erhalten Essensplan, Gruppenstunde und die zentrale Domain HTTP 401 mit `code: "session_expired"`

#### Scenario: Google-Anmeldung in zweiter App
- **GIVEN** ein Nutzer hat sich per Google angemeldet
- **WHEN** er über den App-Switcher eine andere App öffnet
- **THEN** gilt die Anmeldung dort 30 Tage mit Verlängerung bei Nutzung

### Requirement: Übernahme ersetzt keine Sicherheitsabfrage
Sicherheitskritische Aktionen, die eine frische Anmeldung verlangen (z. B. Konto löschen, Anbieter trennen), MUST den Zeitpunkt der ursprünglichen Anmeldung prüfen. Eine Übernahme per Plattform-Abgleich MUST NOT als frische Anmeldung gelten.

#### Scenario: Konto löschen nach App-Wechsel
- **GIVEN** ein Nutzer hat sich vor zwei Stunden in Gruppenstunde angemeldet und ist gerade per App-Switcher in die Konto-App gewechselt
- **WHEN** er „Konto löschen“ bestätigt
- **THEN** antwortet das System mit HTTP 401 und `code: "reauth_required"`
- **AND** die Konto-App bittet ihn, sich erneut anzumelden

### Requirement: Abmelden auf allen Domains
„Abmelden“ in einer beliebigen App SHALL alle Sessions beenden, die in diesem Browser über die Plattform miteinander verbunden sind, auf allen Domains einschließlich der zentralen. Sessions auf anderen Geräten MUST bestehen bleiben.

#### Scenario: Abmelden im Essensplan
- **GIVEN** ein Nutzer ist im selben Browser in Gruppenstunde und im Essensplan angemeldet
- **WHEN** er im Essensplan „Abmelden“ wählt
- **THEN** liefert `GET /api/auth/me/` auf beiden Domains und auf `konto.gruppenstunde.de` `{ is_authenticated: false, user: null }`

#### Scenario: Anderes Gerät bleibt angemeldet
- **GIVEN** ein Nutzer ist auf Laptop und Handy angemeldet
- **WHEN** er sich auf dem Handy abmeldet
- **THEN** bleibt er auf dem Laptop angemeldet

### Requirement: Erlaubte App-Origins
Das Backend SHALL eine konfigurierbare Liste der App-Origins führen. Nur für diese Origins SHALL es Übergaben ausstellen, CSRF-Anfragen akzeptieren und Rücksprünge zulassen. Lokal SHALL die Liste die Dev-Server-Origins enthalten.

#### Scenario: Lokale Entwicklung
- **GIVEN** Gruppenstunde und Essensplan laufen lokal auf ihren Dev-Ports
- **WHEN** ein Entwickler sich in Gruppenstunde anmeldet und über den App-Switcher zum Essensplan wechselt
- **THEN** ist er im Essensplan angemeldet

#### Scenario: Unbekannte Origin
- **WHEN** eine Übergabe für eine Origin angefragt wird, die nicht in der Liste steht
- **THEN** stellt das System kein Token aus
