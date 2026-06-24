# meal-plan-timeframe Specification

## Purpose
Ermöglicht das Festlegen von Start- und End-Datetime für einen MealPlan und das dynamische Hinzufügen von Tagen davor und danach.
## Requirements
### Requirement: MealPlan hat Start- und End-Datetime

Ein MealPlan speichert `start_datetime` und `end_datetime` als optionale DateTimeFields.

#### Scenario: Neuer MealPlan mit Zeitraum erstellen
- **WHEN** ein MealPlan mit `start_datetime` und `end_datetime` erstellt wird
- **THEN** werden Tage aus dem Zeitraum abgeleitet und Meals automatisch generiert

#### Scenario: Erster Tag — Meals nach Startzeit filtern (ohne Drinks)
- **WHEN** `start_datetime.time()` nach dem Default-Start einer Mahlzeit liegt (z.B. Start 14:00, Frühstück 08:00)
- **THEN** wird diese Mahlzeit am ersten Tag NICHT generiert (betrifft alle 4 Mahlzeittypen: breakfast, lunch, dinner, snack, ohne drinks)

#### Scenario: Letzter Tag — Meals nach Endzeit filtern (ohne Drinks)
- **WHEN** `end_datetime.time()` vor dem Default-Ende einer Mahlzeit liegt (z.B. Ende 11:00, Mittagessen 13:00)
- **THEN** wird diese Mahlzeit am letzten Tag NICHT generiert (betrifft alle 4 Mahlzeittypen: breakfast, lunch, dinner, snack, ohne drinks)

#### Scenario: Mittlere Tage — voller Mahlzeiten-Satz
- **WHEN** ein Tag weder erster noch letzter Tag ist
- **THEN** werden alle Default-Meals generiert (Frühstück, Mittag, Abendessen, Snack)

### Requirement: Tag davor einfügen
Ein Button "Tag davor" erweitert den Plan um einen Tag am Anfang.

#### Scenario: Tag davor einfügen
- **WHEN** der User "Tag davor" klickt
- **THEN** wird `start_datetime` um 1 Tag zurückgesetzt
- **THEN** wird für den neuen ersten Tag Meals generiert (gefiltert nach Startzeit)
- **THEN** wird der bisherige erste Tag mit fehlenden Meals aufgefüllt (wird jetzt voller Tag)

---

### Requirement: Tag danach einfügen
Ein Button "Tag danach" erweitert den Plan um einen Tag am Ende.

#### Scenario: Tag danach einfügen
- **WHEN** der User "Tag danach" klickt
- **THEN** wird `end_datetime` um 1 Tag nach vorne gesetzt
- **THEN** wird für den neuen letzten Tag Meals generiert (gefiltert nach Endzeit)
- **THEN** wird der bisherige letzte Tag mit fehlenden Meals aufgefüllt (wird jetzt voller Tag)

---

### Requirement: Start/Ende im Frontend editierbar
Der User kann Start- und End-Datetime im Settings-Panel anpassen.

#### Scenario: Datetime ändern
- **WHEN** der User `start_datetime` oder `end_datetime` im Settings-Panel ändert und speichert
- **THEN** wird der MealPlan aktualisiert (keine automatische Meal-Generierung/-Löschung)

---

### Requirement: Migration bestehender Daten
Bestehende MealPlans bekommen Start/Ende aus ihren vorhandenen Meals.

#### Scenario: Bestehender Plan ohne Zeitraum
- **WHEN** ein MealPlan Meals hat aber kein `start_datetime`/`end_datetime`
- **THEN** werden die Werte aus dem frühesten/spätesten Meal-Datetime abgeleitet
