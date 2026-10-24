# Spec Delta: events-frontend-app

## Purpose

Das Anmeldesystem läuft als eigenständige App mit eigener Domain, damit Organisierende, Eltern und Teilnehmende Aktionen und Anmeldungen finden, ohne die Ideen- und Food-Funktionen der anderen Produkte zu sehen.

## ADDED Requirements

### Requirement: Anmelde-App als eigenständige Anwendung
Das System SHALL eine eigenständige Anmelde-App unter einer eigenen Domain bereitstellen. Sie SHALL alle Seiten des Aktions- und Anmeldesystems enthalten: Übersicht, Aktion anlegen, Organisations-Dashboard, öffentliche Aktionsseite, Gast-Anmeldung, Elternzugang und QR-Code. Die Gruppenstunde-App MUST keine dieser Seiten enthalten.

#### Scenario: Organisator öffnet seine Aktionen
- **GIVEN** ein angemeldeter Organisator
- **WHEN** er die Startseite der Anmelde-App öffnet
- **THEN** sieht er seine Aktionen und „Neue Aktion“

#### Scenario: Alte Gruppenstunde-URL
- **WHEN** jemand `https://gruppenstunde.de/events/<slug>` aufruft
- **THEN** wird er dauerhaft (HTTP 301) auf die gleiche Aktion in der Anmelde-App weitergeleitet, mit allen Unterpfaden und Query-Parametern

### Requirement: Eigene Navigation ohne Fremdprodukte
Die Anmelde-App SHALL eine eigene Navigation haben, die nur Anmelde-Funktionen enthält. Andere Produkte SHALL nur über den App-Switcher und über Deep-Links erreichbar sein.

#### Scenario: Navigation
- **WHEN** ein angemeldeter Nutzer die Anmelde-App öffnet
- **THEN** zeigt die Navigation „Meine Aktionen“, „Meine Anmeldungen“ und „Neue Aktion“
- **AND** sie zeigt keine Einträge für Gruppenstunden, Spiele, Rezepte oder Einkaufslisten
- **AND** gespeicherte Personen erreicht er über „Personen verwalten“, einen Link in die Konto-App

### Requirement: Gast-Anmeldung ohne Konto
Anmeldungen über den Gast-Link einer Aktion und der Elternzugang per Token SHALL ohne Konto und ohne Login funktionieren.

#### Scenario: Eltern melden ein Kind an
- **GIVEN** eine Aktion mit aktivierter Gast-Anmeldung
- **WHEN** ein nicht angemeldeter Elternteil den Gast-Link öffnet und das Formular absendet
- **THEN** wird die Anmeldung gespeichert und eine Bestätigungs-E-Mail versendet
- **AND** zu keinem Zeitpunkt wird eine Login-Seite angezeigt

#### Scenario: Elternzugang per Token
- **WHEN** ein Elternteil den Elternzugangs-Link aufruft
- **THEN** sieht er die Informationen zur Aktion ohne Anmeldung

### Requirement: Gast-Anmeldung hängt nie an einem echten Konto
Eine Gast-Anmeldung ohne Login MUST NOT Daten an ein Konto hängen, mit dem sich schon einmal jemand angemeldet hat, egal mit welcher Methode. Sie SHALL nur ein ausdrücklich als Gast markiertes Konto wiederverwenden oder ein neues Gast-Konto anlegen.

#### Scenario: E-Mail eines Google-Nutzers
- **GIVEN** `max@example.org` hat ein Konto, mit dem er sich per Google anmeldet
- **WHEN** jemand ohne Login eine Gast-Anmeldung mit `max@example.org` absendet
- **THEN** landet die Anmeldung in einem separaten Gast-Konto
- **AND** in Max' Konto erscheint sie erst, wenn er sie nach seiner Anmeldung übernimmt

#### Scenario: Wiederholte Gast-Anmeldung
- **GIVEN** zu `eltern@example.org` gibt es nur ein Gast-Konto
- **WHEN** ohne Login eine weitere Gast-Anmeldung mit dieser Adresse abgesendet wird
- **THEN** wird dasselbe Gast-Konto wiederverwendet

### Requirement: Gast-Anmeldungen später mit einem Konto verknüpfen
Gibt es zur E-Mail-Adresse eines angemeldeten Nutzers Gast-Anmeldungen und hat der Nutzer diese Adresse bei der aktuellen Anmeldung bestätigt (E-Mail-Link oder vom Anbieter bestätigte E-Mail), SHALL die Anmelde-App anbieten, sie zu übernehmen. Erst nach seiner Zustimmung SHALL das System Anmeldungen und Personen der Gast-Konten in sein Konto umhängen und die Gast-Konten deaktivieren. Ohne bestätigte Adresse MUST das Angebot nicht erscheinen.

#### Scenario: Übernahme nach Anmeldung
- **GIVEN** zu `eltern@example.org` gibt es zwei Gast-Anmeldungen und ein Konto, das bisher nur Google nutzte
- **WHEN** der Nutzer sich mit Google und der bestätigten Adresse `eltern@example.org` in der Anmelde-App anmeldet
- **THEN** sieht er „Wir haben 2 frühere Anmeldungen zu deiner E-Mail-Adresse gefunden. Übernehmen?“
- **AND** nach „Übernehmen“ erscheinen beide unter „Meine Anmeldungen“

#### Scenario: Ablehnen
- **WHEN** der Nutzer „Nicht jetzt“ wählt
- **THEN** bleiben die Gast-Anmeldungen unverändert und das Angebot erscheint bei der nächsten Anmeldung erneut

#### Scenario: Übernahme ohne Anmeldung
- **WHEN** ein nicht angemeldeter Client `POST /api/events/guest-claims/` aufruft
- **THEN** antwortet das System mit HTTP 401 und `code: "auth_required"`

### Requirement: Login in der Anmelde-App
Organisierende Funktionen der Anmelde-App SHALL eine Anmeldung voraussetzen. Die Anmeldung SHALL auf der Login-Seite der Anmelde-App im eigenen Design stattfinden; eine bestehende Plattform-Anmeldung SHALL dabei ohne Anbieterauswahl übernommen werden (`platform-sso`).

#### Scenario: Anonym auf „Neue Aktion“
- **WHEN** ein Besucher ohne jede Plattform-Anmeldung „Neue Aktion“ öffnet
- **THEN** sieht er die Login-Seite der Anmelde-App und landet nach der Anmeldung wieder auf „Neue Aktion“

#### Scenario: Schon in Gruppenstunde angemeldet
- **GIVEN** ein Nutzer ist in Gruppenstunde angemeldet
- **WHEN** er in der Anmelde-App „Neue Aktion“ öffnet
- **THEN** ist er ohne Login-Seite angemeldet und sieht „Neue Aktion“
