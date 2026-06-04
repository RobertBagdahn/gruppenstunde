## MODIFIED Requirements

### Requirement: Tabellarische Grid-Übersicht
Die MealPlan-Detailseite SHALL einen Tab "Tabelle" mit einer echten, strukturierten Tabellendarstellung (`<table>` Element) bieten: Spalten = Tage (geplante Daten), Zeilen = Mahlzeittypen (Frühstück, Mittagessen, Abendessen, Snack, Getränke).

#### Scenario: Benutzer öffnet Tabellen-Tab
- **WHEN** der Benutzer den Tab "Tabelle" in der MealPlan-Detailseite auswählt
- **THEN** wird eine strukturierte HTML-Tabelle mit Tagen als Spalten und den 5 Mahlzeittypen als Zeilen angezeigt

#### Scenario: Zelle zeigt Mahlzeit-Zusammenfassung
- **WHEN** eine Mahlzeit für einen bestimmten Tag und Typ existiert
- **THEN** zeigt die Zelle: Rezeptname(n), Personenzahl (override_portions oder norm_portions), und Notiz (falls vorhanden), ohne sichtbare Aktionsschaltflächen im Zelle-Körper

#### Scenario: Leere Zelle
- **WHEN** keine Mahlzeit für einen Tag/Typ existiert
- **THEN** wird die Zelle als leerer Slot mit einer dezent gestrichelten Umrandung und einem dezenten Aktions-Button `[⋮]` dargestellt

#### Scenario: Mobile Darstellung
- **WHEN** die Ansicht auf einem schmalen Bildschirm (< 768px) angezeigt wird
- **THEN** wird die Tabelle in einem scrollbaren Container mit `overflow-x-auto` gehalten, wobei die erste Spalte ("Mahlzeit") links fixiert (`sticky left-0`) bleibt

### Requirement: Always-Visible 5-Meal Grid
The system SHALL display all 5 active meal types (breakfast, lunch, dinner, snack, drinks) as rows in the table view, regardless of whether a Meal object exists for that slot. Dessert SHALL NOT be displayed in the table view rows.

#### Scenario: Full grid layout
- **WHEN** the user opens the table view for a meal plan
- **THEN** the system displays columns for all scheduled dates and rows for breakfast, lunch, dinner, snack, and drinks, with placeholder cells for empty slots, excluding dessert.

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
