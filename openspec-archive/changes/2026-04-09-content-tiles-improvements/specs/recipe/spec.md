## MODIFIED Requirements

### Requirement: RecipeCard Metadaten-Anzeige

Die RecipeCard MUSS Content-Typ-spezifische Metadaten prominent anzeigen.

#### Scenario: Metadaten auf RecipeCard
- **WHEN** eine RecipeCard in der Listenansicht gerendert wird
- **THEN** MUSS sie folgende Metadaten als Icon+Text anzeigen: Nutri-Score Badge (A-E, farbig), Rezepttyp (als Label), Zubereitungszeit (Uhr-Icon + Minuten), Schwierigkeit (Stern-Icons), Kosten-Rating (Euro-Icons)
- **THEN** MÜSSEN bis zu 3 Tags als kompakte Chips sichtbar sein

#### Scenario: Kompakte Darstellung bei 5 Spalten
- **WHEN** die RecipeCard bei einer Spaltenbreite von ca. 220px gerendert wird
- **THEN** MÜSSEN Metadaten als Icons mit Kurztext dargestellt werden (z.B. „⏱ 30min" statt „Zubereitungszeit: 30 Minuten")
- **THEN** MUSS der Titel einzeilig mit Textabschnitt (`truncate`) dargestellt werden
