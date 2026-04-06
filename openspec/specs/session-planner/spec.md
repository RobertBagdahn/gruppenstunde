# session-planner Specification

## Purpose

Heimabend-Planungstool fuer Pfadfinder-Gruppenfuehrer. Ermoeglicht die Planung woechentlicher Gruppenstunden (Heimabende) mit einem festen Wochentag und einer festen Uhrzeit. Pro Termin kann eine Idea (Typ `idea`) zugewiesen werden. Einzelne Termine koennen als "ausfallend" markiert werden.

## Context

- **Django App**: `planner` (bestehend, wird refactored – der bestehende Planner wird zur Heimabend-Planung umgebaut)
- **API**: `/api/planner/`
- **Frontend-Routen**: `/session-planner` (Landing-Page), `/session-planner/app` (Planer-App)
- **Kontext**: Immer an eine UserGroup gebunden
- **Rhythmus**: Woechentlich, gleicher Wochentag + Uhrzeit

## Requirements

### Requirement: Heimabend-Planer CRUD

Das System MUST vollstaendige CRUD-Operationen fuer Heimabend-Planer ueber `/api/planner/` bereitstellen.

#### Scenario: Planer erstellen

- GIVEN ein authentifizierter Benutzer, der Admin einer Gruppe ist
- WHEN der Benutzer POST `/api/planner/` mit Gruppe, Wochentag, Uhrzeit und Titel absendet
- THEN wird ein Planer fuer die Gruppe erstellt
- AND der feste Wochentag (z.B. Freitag) und die Uhrzeit (z.B. 18:00) werden gespeichert

#### Scenario: Planer abrufen

- GIVEN ein bestehender Planer
- WHEN ein Gruppen-Mitglied GET `/api/planner/{id}` aufruft
- THEN werden der Planer mit allen Eintraegen zurueckgegeben
- AND die Eintraege sind chronologisch sortiert

#### Scenario: Eigene Planer auflisten

- GIVEN ein authentifizierter Benutzer, der Mitglied in Gruppen ist
- WHEN der Benutzer GET `/api/planner/` aufruft
- THEN werden alle Planer zurueckgegeben, die zu seinen Gruppen gehoeren

#### Scenario: Planer aktualisieren

- GIVEN der Planer-Owner oder ein Gruppen-Admin
- WHEN der Benutzer PUT `/api/planner/{id}` mit neuen Daten (Titel, Wochentag, Uhrzeit) absendet
- THEN wird der Planer aktualisiert

#### Scenario: Planer loeschen

- GIVEN der Planer-Owner oder ein Gruppen-Admin
- WHEN der Benutzer DELETE `/api/planner/{id}` aufruft
- THEN werden der Planer und alle Eintraege entfernt

### Requirement: Termin-Eintraege (PlannerEntry)

Das System SHALL woechentliche Termin-Eintraege innerhalb eines Planers unterstuetzen.

#### Scenario: Eintrag mit Idea zuordnen

- GIVEN ein Planer mit woechentlichen Terminen
- WHEN der Owner einem Termin eine Idea (Typ `idea`) zuordnet
- THEN wird der PlannerEntry mit der Idea verknuepft
- AND das Datum des Eintrags wird automatisch auf den naechsten entsprechenden Wochentag gesetzt

#### Scenario: Eintrag mit Notizen

- GIVEN ein Termin im Planer
- WHEN der Owner Notizen zu einem Termin hinzufuegt
- THEN werden die Notizen gespeichert (zusaetzlich zur oder statt einer Idea)

#### Scenario: Termin als ausfallend markieren

- GIVEN ein geplanter Termin
- WHEN der Owner den Termin als "ausfallend" markiert
- THEN wird der Status auf "cancelled" gesetzt
- AND der Termin wird visuell als ausfallend dargestellt (z.B. durchgestrichen)

#### Scenario: Eintrag-Status

- GIVEN ein PlannerEntry
- THEN hat er einen der folgenden Status:
  - `planned` — Termin findet statt (Standard)
  - `cancelled` — Termin faellt aus

#### Scenario: Eintrag aktualisieren

- GIVEN ein bestehender Eintrag
- WHEN der Owner die Idea, Notizen oder den Status aendert
- THEN wird der Eintrag aktualisiert

#### Scenario: Eintrag loeschen

- GIVEN ein bestehender Eintrag
- WHEN der Owner den Eintrag loescht
- THEN wird der Eintrag aus dem Planer entfernt

### Requirement: Kalender-Ansicht

Das System SHOULD eine Kalender-Ansicht fuer den Planer bereitstellen.

#### Scenario: Wochen-/Monatsansicht

- GIVEN ein Planer mit Eintraegen
- WHEN der Benutzer die Kalender-Ansicht oeffnet
- THEN werden die woechentlichen Termine in einer Kalender-Darstellung angezeigt
- AND ausfallende Termine werden visuell unterschieden

#### Scenario: Leere Termine anzeigen

- GIVEN ein Planer mit festem Wochentag
- WHEN ein zukuenftiger Termin noch keine Idea zugeordnet hat
- THEN wird der Termin als leerer Slot angezeigt, der befuellt werden kann

### Requirement: Zusammenarbeit

Das System SHALL das Teilen von Planern innerhalb einer Gruppe unterstuetzen.

#### Scenario: Gruppen-Mitglieder koennen lesen

- GIVEN ein Planer, der einer Gruppe zugeordnet ist
- WHEN ein Gruppen-Mitglied den Planer aufruft
- THEN kann das Mitglied alle Eintraege sehen

#### Scenario: Gruppen-Admins koennen editieren

- GIVEN ein Planer, der einer Gruppe zugeordnet ist
- WHEN ein Gruppen-Admin den Planer aufruft
- THEN kann der Admin Eintraege hinzufuegen, bearbeiten und loeschen

#### Scenario: Mitarbeiter einladen

- GIVEN der Planer-Owner
- WHEN der Owner einen Benutzer als Mitarbeiter (Editor/Viewer) einlaedt
- THEN bekommt der Benutzer entsprechenden Zugriff, auch wenn er kein Gruppen-Mitglied ist
