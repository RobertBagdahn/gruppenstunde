# meal-plan-table-view Specification

## Purpose

Tabellarische Grid-Darstellung des Essensplans mit Direktbearbeitung.

## Requirements

### Requirement: Tabellarische Grid-Übersicht

Die MealPlan-Detailseite SHALL einen Tab "Tabelle" mit einer Grid-Darstellung bieten: Spalten = Tage, Zeilen = Mahlzeittypen (Frühstück, Mittag, Abend, Snack).

#### Scenario: Benutzer öffnet Tabellen-Tab
- **WHEN** der Benutzer den Tab "Tabelle" in der MealPlan-Detailseite auswählt
- **THEN** wird ein Grid angezeigt mit Tagen als Spalten und Mahlzeittypen als Zeilen

#### Scenario: Zelle zeigt Mahlzeit-Zusammenfassung
- **WHEN** eine Mahlzeit für einen bestimmten Tag und Typ existiert
- **THEN** zeigt die Zelle: Rezeptname(n), Personenzahl (override_portions oder norm_portions), und Notiz (falls vorhanden)

#### Scenario: Leere Zelle
- **WHEN** keine Mahlzeit für einen Tag/Typ existiert
- **THEN** wird die Zelle leer oder mit Platzhalter dargestellt

#### Scenario: Mobile Darstellung
- **WHEN** die Ansicht auf einem schmalen Bildschirm (< 768px) angezeigt wird
- **THEN** wird die Tabelle horizontal scrollbar oder in eine gestapelte Ansicht umgewandelt

### Requirement: Always-Visible 5-Meal Grid
The system SHALL display all 5 meal types (breakfast, lunch, dinner, snack, dessert) as rows in the table view, regardless of whether a Meal object exists for that slot.

#### Scenario: Full grid layout
- **WHEN** the user opens the table view for a meal plan
- **THEN** the system displays columns for all scheduled dates and rows for breakfast, lunch, dinner, snack, and dessert, with placeholder cells for empty slots.

### Requirement: Placeholder Quick Actions for Empty Slots
The system SHALL render placeholder actions ("+ Rezept", "+ Zutat", "+ Notiz") in empty grid cells, which automatically initialize a new Meal slot for that date/type upon interaction.

#### Scenario: User clicks + Rezept on empty slot
- **WHEN** the user clicks "+ Rezept" on an empty "breakfast" slot for Saturday
- **THEN** the system triggers a POST request to create the "breakfast" meal for that date and opens the recipe search dialog.

#### Scenario: User clicks + Zutat on empty slot
- **WHEN** the user clicks "+ Zutat" on an empty "lunch" slot for Sunday
- **THEN** the system triggers a POST request to create the "lunch" meal for that date and opens the ingredient search/details dialog.

#### Scenario: User clicks + Notiz on empty slot
- **WHEN** the user clicks "+ Notiz" on an empty "dinner" slot for Friday
- **THEN** the system triggers a POST request to create the "dinner" meal for that date and opens an inline text input to edit the note.

### Requirement: Inline Factor and Note Controls
The system SHALL display an inline factor multiplier input ("×" prefix) and editable note/details for each added recipe/ingredient directly inside the table cells.

#### Scenario: User updates item factor in table
- **WHEN** the user edits the factor input of a recipe item in a table cell to "1,5" and loses focus
- **THEN** the system triggers a PATCH request to update the factor and refreshes the table's nutrition/cost display.

#### Scenario: User deletes item from table cell
- **WHEN** the user clicks the "Entfernen" button on a recipe item in a table cell
- **THEN** the system triggers a DELETE request to remove the item and updates the cell content.

### Requirement: Tägliche Budget-Ampel im Tabellenfuß

Das System SHALL im Tabellenfuß (`<tfoot>`) der Tabellenansicht für jeden geplanten Tag eine farbcodierte Budget-Ampel anzeigen, sofern ein Budget pro Tag und Person (`budget_per_person_per_day`) im Speiseplan konfiguriert ist.

- Die täglichen Kosten pro Person berechnen sich aus den Gesamtkosten aller Mahlzeiten des Tages geteilt durch die Anzahl der Normportionen (`norm_portions`).
- Ist kein Tagesbudget konfiguriert (Wert ist null oder <= 0), darf kein Indikator angezeigt werden.
- Die farbliche Kennzeichnung MUSS folgenden Schwellenwerten entsprechen:
  - Grün (Kosten <= Budget): `bg-emerald-50 text-emerald-700 border-emerald-200`
  - Gelb (Kosten <= Budget * 1.2): `bg-amber-50 text-amber-700 border-amber-200`
  - Rot (Kosten > Budget * 1.2): `bg-red-50 text-red-700 border-red-200`
- Das Badge MUSS den verbleibenden Betrag oder den Überschreitungsbetrag wie folgt formatieren:
  - Bei Einhaltung des Budgets: `noch X,XX € / Pers.`
  - Bei Überschreitung des Budgets: `+X,XX € / Pers.`

#### Scenario: Budget eingehalten (Grün)
- **WHEN** die Kosten pro Person an einem Tag <= dem konfigurierten Budget sind
- **THEN** zeigt das System ein grünes Badge mit dem verbleibenden Betrag im Format `noch X,XX € / Pers.` an

#### Scenario: Budget leicht überschritten (Gelb)
- **WHEN** die Kosten pro Person an einem Tag > dem konfigurierten Budget, aber <= Budget * 1.2 sind
- **THEN** zeigt das System ein gelbes Badge mit dem Überschreitungsbetrag im Format `+X,XX € / Pers.` an

#### Scenario: Budget deutlich überschritten (Rot)
- **WHEN** die Kosten pro Person an einem Tag > Budget * 1.2 sind
- **THEN** zeigt das System ein rotes Badge mit dem Überschreitungsbetrag im Format `+X,XX € / Pers.` an

#### Scenario: Kein Budget konfiguriert
- **WHEN** kein Budget im Speiseplan konfiguriert ist (null oder <= 0)
- **THEN** wird kein Budget-Indikator in den Spalten des Tabellenfußes angezeigt
