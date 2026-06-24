# meal-plan-table-view Specification

## Purpose

Tabellarische Grid-Darstellung des Essensplans mit Direktbearbeitung.
## Requirements
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

### Requirement: Placeholder Quick Actions for Empty Slots
The system SHALL render a single dropdown trigger button (`[⋮]`) in empty grid cells. Clicking this button SHALL open a dropdown menu with actions ("Rezept hinzufügen...", "Zutat hinzufügen...", "Notiz hinzufügen...") which automatically initialize a new Meal slot for that date/type upon interaction.

#### Scenario: User clicks + Rezept on empty slot
- **WHEN** the user clicks "Rezept hinzufügen..." in the empty slot dropdown menu for a Saturday
- **THEN** the system triggers a POST request to create the meal for that date and opens the recipe search dialog.

#### Scenario: User clicks + Zutat on empty slot
- **WHEN** the user clicks "Zutat hinzufügen..." in the empty slot dropdown menu for a Sunday
- **THEN** the system triggers a POST request to create the meal for that date and opens the ingredient search dialog.

#### Scenario: User clicks + Notiz on empty slot
- **WHEN** the user clicks "Notiz hinzufügen..." in the empty slot dropdown menu for a Friday
- **THEN** the system triggers a POST request to create the meal for that date and opens an inline text input to edit the note.

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

#### Scenario: Budget-Vergleich mit skalierter Coverage
- **WHEN** ein Tag nur teilweise Abdeckung hat (z.B. 40% Coverage)
- **THEN** MUSS der Budget-Vergleich das skalierte Budget (`budget × effectiveCoverage`) verwenden

### Requirement: Graue Zellen auf ersten/letzten Tagen

Das System SHALL auf dem ersten und letzten Tag eines Essensplans (basierend auf `start_datetime`/`end_datetime`) Zellen für Mahlzeit-Typen, die aufgrund des Zeitrahmens natürlicherweise fehlen, grau hinterlegen. Eine Zelle gilt als "natürlicherweise fehlend", wenn die Default-Startzeit des Mahlzeit-Typs vor der Plan-Startzeit liegt (erster Tag) oder die Default-Endzeit nach der Plan-Endzeit liegt (letzter Tag).

Graue Zellen SHALL:
- einen dezenten grauen Hintergrund (`bg-muted/30`) und keine Interaktion (Dropdown-Button) anzeigen
- einen dezenten Text "—" oder einen Hinweis wie "Start um 14:00" enthalten
- KEINEN "Mahlzeit leer"-Alert (rot) anzeigen — das ist nur für existierende, aber leere Mahlzeiten reserviert

#### Scenario: Erster Tag mit Start um 14:00
- **WHEN** ein Essensplan am 2026-06-07 um 14:00 startet
- **AND** der Benutzer die Tabellenansicht öffnet
- **THEN** sind die Zellen für Frühstück (Start 08:00) und Mittag (Start 12:00) des 2026-06-07 grau hinterlegt
- **THEN** enthalten diese Zellen keinen "Mahlzeit leer"-Hinweis und kein Dropdown-Menü
- **THEN** enthalten diese Zellen den Hinweistext "Planstart: 14:00"

#### Scenario: Letzter Tag mit Ende um 12:00
- **WHEN** ein Essensplan am 2026-06-10 um 12:00 endet
- **AND** der Benutzer die Tabellenansicht öffnet
- **THEN** sind die Zellen für Mittag (Ende 13:00 > 12:00), Abendessen (Ende 19:00 > 12:00), Snack (Ende 15:30 > 12:00) und Getränke (Ende 16:30 > 12:00) des 2026-06-10 grau hinterlegt
- **THEN** nur die Frühstücks-Zelle ist nicht grau (Ende 09:00 ≤ 12:00)

#### Scenario: Innentag ohne Zeitrahmen-Einschränkung
- **WHEN** ein Tag weder der erste noch der letzte Tag ist
- **THEN** sind alle Zellen normal (keine grauen Zellen)

### Requirement: Coverage-Badge im Tabellen-Footer

Das System SHALL im Tabellen-Footer (`<tfoot>`) in der Tagesbilanz-Zelle für jeden Tag einen Coverage-Badge anzeigen. Der Badge SHALL zwischen den kcal- und Kosten-Informationen platziert werden.

#### Scenario: Coverage-Badge in Tagesbilanz
- **WHEN** ein Benutzer die Tabellenansicht mit einem Tag mit 40% Coverage betrachtet
- **THEN** zeigt die Tagesbilanz-Zelle einen Coverage-Badge "Teilweise 40 %" (gelb)
- **THEN** der Badge wird zwischen kcal- und Kosten-Zeile angezeigt

### Requirement: Always-Visible 4-Meal Grid

The system SHALL display all 4 active meal types (breakfast, lunch, dinner, snack) as rows in the table view, regardless of whether a Meal object exists for that slot. The drinks row SHALL NOT be displayed.

#### Scenario: Full grid layout
- **WHEN** the user opens the table view for a meal plan
- **THEN** the system displays columns for all scheduled dates and rows for breakfast, lunch, dinner, and snack, with placeholder cells for empty slots.
