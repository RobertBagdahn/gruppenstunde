# meal-plan-time-editing Specification

## Purpose
Display and allow editing of per-meal start/end times in the meal plan, anchored to the `Europe/Berlin` timezone, with plan-specific default times applied when creating new meals.

## Requirements
### Requirement: Uhrzeit pro Mahlzeit in der Tagesplan-Übersicht

Die Tagesplan-Übersicht (`MealSlot`) SHALL die Start- und Endzeit jeder Mahlzeit als
eigene Zeile unter dem Mahlzeit-Namen anzeigen. Die Zeit MUST fix in der Zeitzone
`Europe/Berlin` formatiert werden, unabhängig von der Zeitzone des Betrachter-Browsers.
Mahlzeiten ohne `start_datetime` (z.B. Referenz-Mahlzeiten) DÜRFEN keine Zeit-Zeile zeigen.

#### Scenario: Zeit wird in Europe/Berlin angezeigt
- **WHEN** eine Mahlzeit `start_datetime` 08:00 und `end_datetime` 09:00 (Berlin) hat und der
  Browser in einer anderen Zeitzone läuft
- **THEN** die Übersicht SHALL "08:00–09:00" anzeigen (nicht die browser-lokal umgerechnete Zeit)

#### Scenario: Keine Zeit-Zeile ohne Datum
- **WHEN** eine Mahlzeit kein `start_datetime` hat
- **THEN** SHALL keine Zeit-Zeile gerendert werden

### Requirement: Bearbeitbare Mahlzeit-Uhrzeit

Das System SHALL erlauben, Start- und Endzeit (nur Uhrzeit, Datum bleibt fix) einer
Mahlzeit zu bearbeiten. Der Einstieg MUST über einen Menüpunkt "Zeit bearbeiten…" im
`MealActionsMenu` erfolgen und in Tagesplan- und Tabellenansicht verfügbar sein.
Der Backend-Endpunkt `MealUpdateIn` MUST `start_datetime` und `end_datetime` akzeptieren
und `end_datetime > start_datetime` erzwingen.

#### Scenario: Uhrzeit erfolgreich ändern
- **WHEN** der Nutzer Start auf 07:30 und Ende auf 08:15 setzt
- **THEN** die Mahlzeit SHALL mit demselben Datum und den neuen Uhrzeiten gespeichert werden

#### Scenario: Ende nicht nach Start wird abgelehnt
- **WHEN** der Nutzer eine Endzeit setzt, die kleiner oder gleich der Startzeit ist
- **THEN** der Backend-Endpunkt SHALL mit HTTP 400 antworten und die Mahlzeit nicht ändern

#### Scenario: Überlappung wird nur gewarnt
- **WHEN** die neue Zeit sich mit einer anderen Mahlzeit desselben Tages überschneidet
- **THEN** das Frontend SHALL eine Warnung anzeigen, das Speichern aber NICHT blockieren

### Requirement: Default-Zeiten aus dem Plan beim Anlegen

Beim Anlegen einer neuen Mahlzeit SHALL `handleAddMealType` die plan-spezifischen
`meal_default_times` bevorzugen und nur bei deren Fehlen auf die hardcodierten
Standard-Zeiten zurückfallen.

#### Scenario: Plan-Default-Zeit wird verwendet
- **WHEN** der Plan `meal_default_times` für breakfast = ["07:00", "08:00"] definiert und der
  Nutzer ein neues Frühstück anlegt
- **THEN** die neue Mahlzeit SHALL 07:00–08:00 als Zeit erhalten (nicht den hardcodierten Default)
