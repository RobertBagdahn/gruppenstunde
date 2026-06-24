# meal-plan-schedule Specification

## Purpose
TBD - created by archiving change meal-timeline-snack-merge. Update Purpose after archive.
## Requirements
### Requirement: Zeitplan-Tab mit chronologischer Timeline
Die MealPlan-Detailseite SHALL einen Tab "Zeitplan" mit einer chronologischen Tagesübersicht bieten. Meals werden pro Tag nach `start_datetime` aufsteigend sortiert dargestellt.

#### Scenario: Tag mit mehreren Meals
- **WHEN** ein Tag ein Frühstück (8:00), einen Kaffee-Snack (10:00) und ein Mittagessen (12:00) enthält
- **THEN** werden die Meals in dieser Reihenfolge angezeigt: Frühstück → Kaffee → Mittagessen

#### Scenario: Tag ohne Zeitrahmen
- **WHEN** ein Essensplan ohne `start_datetime`/`end_datetime` existiert
- **THEN** werden Meals trotzdem nach `start_datetime` sortiert angezeigt

### Requirement: Komprimierte Zwischenräume
Die Timeline SHALL keine 24h-Skala abbilden. Zwischenräume zwischen Meals werden komprimiert dargestellt (min. 16px Abstand). Die Uhrzeit wird als Badge/Label an jedem Meal-Eintrag angezeigt.

#### Scenario: Zwei nahe Meals
- **WHEN** ein Frühstück (8:00-9:00) und ein Snack (9:30-10:00) existieren
- **THEN** werden beide mit 16px Abstand dargestellt, mit Uhrzeit-Badges "08:00-09:00" und "09:30-10:00"

#### Scenario: Große Lücke zwischen Meals
- **WHEN** ein Frühstück (8:00) und ein Abendessen (18:00) existieren
- **THEN** wird die Lücke nicht proportional dargestellt, sondern auf ~32px komprimiert

### Requirement: Uhrzeit-Anzeige pro Meal
Jeder Meal-Eintrag in der Timeline SHALL seine Start- und End-Uhrzeit prominent anzeigen (z.B. "08:00 – 09:00"). Snacks und Getränke zeigen ebenfalls ihre Uhrzeit.

#### Scenario: Meal mit start/end-datetime
- **WHEN** ein Meal `start_datetime=2026-06-07T18:00:00Z` und `end_datetime=2026-06-07T19:00:00Z` hat
- **THEN** wird im Zeitplan "18:00 – 19:00" angezeigt

### Requirement: display_name-Anzeige
Jeder Meal-Eintrag SHALL seinen `display_name` (falls gesetzt) oder den Meal-Type-Label anzeigen. Bei Snacks mit `display_name` wird dieser bevorzugt.

#### Scenario: Snack mit display_name
- **WHEN** ein Snack-Meal `display_name="Kaffee"` hat
- **THEN** wird im Zeitplan "Kaffee" angezeigt (nicht "Snack")

#### Scenario: Snack ohne display_name
- **WHEN** ein Snack-Meal `display_name=""` hat
- **THEN** wird "Snack" (oder `MEAL_TYPE_LABELS['snack']`) angezeigt

### Requirement: Items in der Timeline
Jeder Meal-Eintrag in der Timeline SHALL seine zugeordneten Rezepte/Items (wie im DayPlanView) anzeigen.

#### Scenario: Meal mit Rezepten
- **WHEN** ein Abendessen-Meal zwei Rezepte enthält
- **THEN** werden beide Rezepte unter der Uhrzeit/display_name des Meals aufgelistet

### Requirement: Tag-Header in der Timeline
Die Timeline SHALL für jeden Tag einen Header mit Datum und Tages-Kcal/Coverage (wie im DayPlanView) anzeigen.

#### Scenario: Tag-Header
- **WHEN** die Timeline für einen Tag mit mehreren Meals angezeigt wird
- **THEN** zeigt der Tag-Header: Datum, Tages-Kcal (Soll/Ist) und Coverage-Badge

### Requirement: Mobile-Ansicht
Auf schmalen Bildschirmen (< 768px) SHALL die Timeline vertikal scrollbar sein, mit festem Tag-Header.

#### Scenario: Mobile Timeline
- **WHEN** die Ansicht auf 375px Breite angezeigt wird
- **THEN** sind alle Meals untereinander gestapelt, mit Uhrzeit-Badges links und Inhalten rechts

### Requirement: Interaktion in der Timeline
Die Timeline SHALL die gleichen Interaktionsmöglichkeiten bieten wie der DayPlanView: Rezepte hinzufügen/entfernen, Faktor editieren, Meal löschen.

#### Scenario: Rezept zu Meal hinzufügen
- **WHEN** der Benutzer im Zeitplan auf das Plus-Icon eines Meals klickt
- **THEN** öffnet sich die Rezept-Suche wie im Tagesplan
