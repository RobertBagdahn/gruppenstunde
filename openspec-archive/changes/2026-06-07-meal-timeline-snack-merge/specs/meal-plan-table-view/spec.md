# meal-plan-table-view Specification — Delta

## MODIFIED Requirements

### Requirement: Tabellarische Grid-Übersicht

Die MealPlan-Detailseite SHALL einen Tab "Tabelle" mit einer echten, strukturierten Tabellendarstellung (`<table>` Element) bieten: Spalten = Tage (geplante Daten), Zeilen = Mahlzeittypen (Frühstück, Mittagessen, Abendessen, Snack).

Die Snack-Zeile SHALL alle snack-Meals eines Tages enthalten. Wenn mehrere snack-Meals an einem Tag existieren, werden sie in der Zelle untereinander aufgelistet, jeweils mit `display_name` und Uhrzeit.

#### Scenario: Benutzer öffnet Tabellen-Tab
- **WHEN** der Benutzer den Tab "Tabelle" in der MealPlan-Detailseite auswählt
- **THEN** wird eine strukturierte HTML-Tabelle mit Tagen als Spalten und den 4 Mahlzeittypen als Zeilen angezeigt

#### Scenario: Zelle zeigt Mahlzeit-Zusammenfassung
- **WHEN** eine Mahlzeit für einen bestimmten Tag und Typ existiert
- **THEN** zeigt die Zelle: Rezeptname(n), Personenzahl (override_portions oder norm_portions), und Notiz (falls vorhanden)

#### Scenario: Mehrere Snacks an einem Tag
- **WHEN** ein Tag zwei snack-Meals hat (z.B. "Kaffee" um 10:00 und "Kekse" um 15:00)
- **THEN** zeigt die Snack-Zelle beide untereinander, jeweils mit `display_name` und Uhrzeit

#### Scenario: Mobile Darstellung
- **WHEN** die Ansicht auf einem schmalen Bildschirm (< 768px) angezeigt wird
- **THEN** wird die Tabelle in einem scrollbaren Container mit `overflow-x-auto` gehalten, wobei die erste Spalte ("Mahlzeit") links fixiert (`sticky left-0`) bleibt

## REMOVED Requirements

### Requirement: Always-Visible 5-Meal Grid

**Reason**: `drinks` als MealTypeChoice entfernt, kein separater Tabellen-Row mehr nötig.

**Migration**: Vorhandene drinks-Meals werden zu snack-Meals. In der Snack-Zelle angezeigt.

## ADDED Requirements

### Requirement: Always-Visible 4-Meal Grid

The system SHALL display all 4 active meal types (breakfast, lunch, dinner, snack) as rows in the table view, regardless of whether a Meal object exists for that slot. The drinks row SHALL NOT be displayed.

#### Scenario: Full grid layout
- **WHEN** the user opens the table view for a meal plan
- **THEN** the system displays columns for all scheduled dates and rows for breakfast, lunch, dinner, and snack, with placeholder cells for empty slots.
