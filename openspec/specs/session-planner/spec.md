# session-planner Specification

## Purpose

Heimabend-Planungstool für Pfadfinder-Gruppenführer. Ermöglicht die Planung wöchentlicher Gruppenstunden (Heimabende) mit einem festen Wochentag und einer festen Uhrzeit. Pro Termin kann eine GroupSession zugewiesen werden. Einzelne Termine können als "ausfallend" markiert werden.

## Context

- **Django App**: `planner`
- **API**: `/api/planner/`
- **Frontend-Routen**: `/session-planner` (Landing-Page), `/session-planner/app` (Planer-App)
- **Kontext**: Immer an eine UserGroup gebunden
- **Rhythmus**: Wöchentlich, gleicher Wochentag + Uhrzeit

## Requirements

### Requirement: Heimabend-Planer CRUD

Das System MUST vollständige CRUD-Operationen für Heimabend-Planer über `/api/planner/` bereitstellen.

#### Scenario: Planer erstellen

- GIVEN ein authentifizierter Benutzer, der Admin einer Gruppe ist
- WHEN der Benutzer POST `/api/planner/` mit Gruppe, Wochentag, Uhrzeit und Titel absendet
- THEN wird ein Planer für die Gruppe erstellt
- AND der feste Wochentag (z.B. Freitag) und die Uhrzeit (z.B. 18:00) werden gespeichert

#### Scenario: Planer abrufen

- GIVEN ein bestehender Planer
- WHEN ein Gruppen-Mitglied GET `/api/planner/{id}` aufruft
- THEN werden der Planer mit allen Einträgen zurückgegeben
- AND die Einträge sind chronologisch sortiert

#### Scenario: Eigene Planer auflisten

- GIVEN ein authentifizierter Benutzer, der Mitglied in Gruppen ist
- WHEN der Benutzer GET `/api/planner/` aufruft
- THEN werden alle Planer zurückgegeben, die zu seinen Gruppen gehören

#### Scenario: Planer aktualisieren

- GIVEN der Planer-Owner oder ein Gruppen-Admin
- WHEN der Benutzer PUT `/api/planner/{id}` mit neuen Daten (Titel, Wochentag, Uhrzeit) absendet
- THEN wird der Planer aktualisiert

#### Scenario: Planer löschen

- GIVEN der Planer-Owner oder ein Gruppen-Admin
- WHEN der Benutzer DELETE `/api/planner/{id}` aufruft
- THEN werden der Planer und alle Einträge entfernt

### Requirement: Termin-Einträge (PlannerEntry)

Das System SHALL wöchentliche Termin-Einträge innerhalb eines Planers unterstützen.

#### Scenario: Eintrag mit GroupSession zuordnen

- GIVEN ein Planer mit wöchentlichen Terminen
- WHEN der Owner einem Termin eine GroupSession zuordnet
- THEN wird der PlannerEntry mit der GroupSession verknüpft (FK `session` zu `session.GroupSession`)
- AND das Datum des Eintrags wird automatisch auf den nächsten entsprechenden Wochentag gesetzt

#### Scenario: Eintrag mit Notizen

- GIVEN ein Termin im Planer
- WHEN der Owner Notizen zu einem Termin hinzufügt
- THEN werden die Notizen gespeichert (zusätzlich zur oder statt einer GroupSession)

#### Scenario: Termin als ausfallend markieren

- GIVEN ein geplanter Termin
- WHEN der Owner den Termin als "ausfallend" markiert
- THEN wird der Status auf "cancelled" gesetzt
- AND der Termin wird visuell als ausfallend dargestellt (z.B. durchgestrichen)

#### Scenario: Eintrag-Status

- GIVEN ein PlannerEntry
- THEN hat er einen der folgenden Status:
  - `planned` — Termin findet statt (Standard)
  - `cancelled` — Termin fällt aus

#### Scenario: Eintrag aktualisieren

- GIVEN ein bestehender Eintrag
- WHEN der Owner die GroupSession, Notizen oder den Status ändert
- THEN wird der Eintrag aktualisiert

#### Scenario: Eintrag löschen

- GIVEN ein bestehender Eintrag
- WHEN der Owner den Eintrag löscht
- THEN wird der Eintrag aus dem Planer entfernt

### Requirement: Kalender-Ansicht

Das System SHOULD eine Kalender-Ansicht für den Planer bereitstellen.

#### Scenario: Wochen-/Monatsansicht

- GIVEN ein Planer mit Einträgen
- WHEN der Benutzer die Kalender-Ansicht öffnet
- THEN werden die wöchentlichen Termine in einer Kalender-Darstellung angezeigt
- AND ausfallende Termine werden visuell unterschieden

#### Scenario: Leere Termine anzeigen

- GIVEN ein Planer mit festem Wochentag
- WHEN ein zukünftiger Termin noch keine GroupSession zugeordnet hat
- THEN wird der Termin als leerer Slot angezeigt, der befüllt werden kann

### Requirement: Zusammenarbeit

Das System SHALL das Teilen von Planern innerhalb einer Gruppe unterstützen.

#### Scenario: Gruppen-Mitglieder können lesen

- GIVEN ein Planer, der einer Gruppe zugeordnet ist
- WHEN ein Gruppen-Mitglied den Planer aufruft
- THEN kann das Mitglied alle Einträge sehen

#### Scenario: Gruppen-Admins können editieren

- GIVEN ein Planer, der einer Gruppe zugeordnet ist
- WHEN ein Gruppen-Admin den Planer aufruft
- THEN kann der Admin Einträge hinzufügen, bearbeiten und löschen

#### Scenario: Mitarbeiter einladen

- GIVEN der Planer-Owner
- WHEN der Owner einen Benutzer als Mitarbeiter (Editor/Viewer) einlädt
- THEN bekommt der Benutzer entsprechenden Zugriff, auch wenn er kein Gruppen-Mitglied ist
