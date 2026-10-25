# Spec Delta: account-app

## Purpose

Die Konto-App ist der einzige Ort, an dem Nutzer ihre plattformweiten Stammdaten pflegen: Konto und verknüpfte Anbieter, Profil, Gruppen, Mitglieder und Rollen, Personen und Kinder, Datenschutz sowie die Nutzerverwaltung für Admins. Ihre Domain dient zusätzlich unsichtbar als zentrale Stelle für den Anmelde-Abgleich.

## ADDED Requirements

### Requirement: Konto-App als eigenständige Anwendung
Das System SHALL eine eigenständige Konto-App unter `konto.gruppenstunde.de` bereitstellen. Sie SHALL nur Plattform-Funktionen enthalten und MUST keine Seiten der Produkte Gruppenstunde, Anmeldung oder Essensplan enthalten.

#### Scenario: Startseite angemeldet
- **GIVEN** ein angemeldeter Nutzer
- **WHEN** er `konto.gruppenstunde.de` öffnet
- **THEN** sieht er eine Übersicht mit Profil, seinen Gruppen und Kacheln zu den drei Produkt-Apps

#### Scenario: Startseite anonym
- **WHEN** ein nicht angemeldeter Besucher `konto.gruppenstunde.de` öffnet
- **THEN** sieht er die Login-Seite der Konto-App mit den konfigurierten Anbietern

### Requirement: Stammdaten nur in der Konto-App bearbeiten
Profil, Gruppen (anlegen, bearbeiten, Mitglieder, Rollen, Beitrittsmodus, Corporate Identity), Personen und Kinder, verknüpfte Anbieter und Datenschutz SHALL nur in der Konto-App bearbeitet werden. Produkt-Apps MAY diese Daten lesen und SHALL für Änderungen auf die passende Konto-Seite verlinken.

#### Scenario: Gruppe aus dem Essensplan bearbeiten
- **GIVEN** ein Nutzer sieht im Essensplan die Gruppe eines Essensplans
- **WHEN** er „Gruppe verwalten“ wählt
- **THEN** öffnet sich `konto.gruppenstunde.de/groups/<slug>`, ohne dass er sich erneut anmelden muss
- **AND** nach dem Speichern führt „Zurück“ wieder zum Essensplan

#### Scenario: Person aus der Anmeldung anlegen
- **GIVEN** ein Organisator möchte bei einer Aktion eine neue gespeicherte Person verwenden
- **WHEN** er „Person anlegen“ wählt
- **THEN** öffnet sich die Personenverwaltung der Konto-App mit Rücksprung zur Aktion

### Requirement: Gruppenrollen gelten in allen Produkt-Apps
Gruppenmitgliedschaften und ihre Rollen (`member`, `admin`) SHALL in der Konto-App gepflegt werden und SHALL in allen Produkt-Apps gleich wirken. Eine Änderung in der Konto-App MUST beim nächsten API-Aufruf in jeder Produkt-App gelten, ohne erneute Anmeldung.

#### Scenario: Mitglied wird Gruppen-Admin
- **GIVEN** ein Mitglied einer Gruppe ist auf `essensplan.app` angemeldet
- **WHEN** eine Gruppen-Admin es in der Konto-App zur Admin macht
- **THEN** darf es beim nächsten Aufruf im Essensplan die Essenspläne der Gruppe bearbeiten, soweit das Food-Rechtesystem dies Gruppen-Admins erlaubt

#### Scenario: Mitglied wird entfernt
- **GIVEN** ein Mitglied wird in der Konto-App aus der Gruppe entfernt
- **WHEN** es danach in der Anmelde-App eine nicht öffentliche Aktion der Gruppe öffnet
- **THEN** antwortet das System mit HTTP 403 und `code: "permission_denied"`

### Requirement: Plattform-Admin in der Konto-App
Nutzerverwaltung (Nutzerliste, Nutzerdetail mit Anmelde- und KI-Informationen) und Gruppenverwaltung für Admins SHALL in der Konto-App liegen. Produktspezifische Admin-Bereiche (z. B. Food-Admin, Content-Freigaben) SHALL in ihrer Produkt-App bleiben.

#### Scenario: Admin öffnet Nutzerdetail
- **GIVEN** ein angemeldeter Admin
- **WHEN** er `konto.gruppenstunde.de/admin/users/<id>` öffnet
- **THEN** sieht er Anmeldeanbieter, letzte Anmeldung und KI-Kontingent des Nutzers

#### Scenario: Nicht-Admin öffnet Admin-Seite
- **WHEN** ein Nutzer ohne Admin-Rechte `/admin/users` in der Konto-App öffnet
- **THEN** sieht er die 403-Seite „Dafür fehlen dir die Rechte.“

### Requirement: Rücksprung in die aufrufende App
Jede Konto-Seite, die aus einer Produkt-App geöffnet wird, SHALL einen Rücksprung anbieten. Das Ziel MUST auf einer erlaubten App-Origin liegen.

#### Scenario: Rücksprung nach Profiländerung
- **GIVEN** ein Nutzer öffnet aus Gruppenstunde `konto.gruppenstunde.de/profile?return=https%3A%2F%2Fgruppenstunde.de%2Fsessions`
- **WHEN** er „Zurück zu Gruppenstunde“ wählt
- **THEN** landet er auf `gruppenstunde.de/sessions`

#### Scenario: Fremder Rücksprung
- **WHEN** `return` auf eine nicht erlaubte Origin zeigt
- **THEN** zeigt die Konto-App keinen Rücksprung-Link an
