# Spec: Recipe Filter Uniform

Einheitliche Multi-Select-Checkbox-Filter für alle Filtergruppen in der Rezeptsuche, mit Backend-Support für nicht-gewählte Filter (alle anzeigen).

## ADDED Requirements

### Requirement: All filter groups use multi-select checkboxes
Alle Filtergruppen in der Rezeptsuche SHALL als Multi-Select-Checkbox-Gruppen implementiert sein. Eine leere Auswahl (nichts angehakt) SHALL bedeuten: alle Optionen dieser Gruppe werden angezeigt.

#### Scenario: No checkbox selected shows all
- **WHEN** in einer Filtergruppe (z.B. Typ, Schwierigkeit, Dauer) keine Checkbox ausgewählt ist
- **THEN** wird der entsprechende Filter-Parameter NICHT an die API gesendet
- **THEN** zeigt die API alle Optionen dieser Kategorie an

#### Scenario: One checkbox selected
- **WHEN** ein Nutzer "Frühstück" in der Typ-Gruppe auswählt
- **THEN** wird `recipe_type=breakfast` an die API gesendet

#### Scenario: Multiple checkboxes selected
- **WHEN** ein Nutzer "Einfach" und "Mittel" in der Schwierigkeit-Gruppe auswählt
- **THEN** werden beide Werte als Array an die API gesendet (z.B. `difficulty=easy,medium`)
- **THEN** zeigt die API Rezepte mit Schwierigkeit "Einfach" ODER "Mittel"

#### Scenario: Deselect last checkbox resets to all
- **WHEN** ein Nutzer die letzte ausgewählte Checkbox einer Gruppe deselektiert
- **THEN** wird der Filter-Parameter aus der URL entfernt
- **THEN** werden wieder alle Optionen angezeigt

### Requirement: Filter sidebar sticky behavior
Die Filter-Sidebar SHALL beim Scrollen der Ergebnisse sichtbar bleiben (sticky).

#### Scenario: Sidebar is sticky on desktop
- **WHEN** ein Nutzer auf einem Desktop-Viewport (> 768px) die Ergebnisse scrollt
- **THEN** bleibt die Filter-Sidebar im Viewport sichtbar (`position: sticky; top: <header-height>`)

#### Scenario: Sidebar scrolls independently if taller than viewport
- **WHEN** die Sidebar-Inhalte höher sind als der Viewport
- **THEN** scrollt die Sidebar eigenständig innerhalb ihres Containers (`overflow-y: auto; max-height: calc(100vh - <header-height>)`)

### Requirement: Unified filter group labels
Die Filtergruppen SHALL folgende Titel verwenden: `Typ`, `Anzeigen`, `Stufe`, `Schwierigkeit`, `Dauer`, `Zubereitungsart`, `Kosten`.

#### Scenario: Filter labels are concise and descriptive
- **WHEN** die Rezeptsuche geöffnet wird
- **THEN** die Filtergruppen zeigen: "Typ" (mit Frühstück, Warm, etc.), "Anzeigen" (mit Inspi-verifiziert, Community, Meine), "Stufe", "Schwierigkeit", "Dauer", "Zubereitungsart", "Kosten"

### Requirement: Cost filter as predefined price ranges
Der Kosten-Filter SHALL als Checkbox-Gruppe mit vordefinierten Preisstufen implementiert sein.

#### Scenario: Cost filter options
- **WHEN** die Filter-Sidebar gerendert wird
- **THEN** die Kosten-Gruppe zeigt: `< 2€`, `2-5€`, `5-10€`, `> 10€`
- **THEN** bei Auswahl von `< 2€` wird `costs_max=2` gesendet
- **THEN** bei Auswahl von `> 10€` wird `costs_min=10` gesendet
- **THEN** bei Auswahl von `2-5€` werden `costs_min=2&costs_max=5` gesendet

### Requirement: Preparation method filter group
Die Sidebar SHALL eine neue Filtergruppe "Zubereitungsart" mit den Optionen Kochen, Backen, Braten, Grillen, Roh bereitstellen.

#### Scenario: Preparation method options
- **WHEN** die Filter-Sidebar gerendert wird
- **THEN** die Gruppe zeigt Checkboxen für: Kochen, Backen, Braten, Grillen, Roh
- **THEN** ausgewählte Optionen werden als `preparation_method`-Parameter an die API gesendet
- **THEN** das Backend unterstützt mehrere Werte (AND-Verknüpfung für `preparation_method`)

### Requirement: Backend supports multi-value filters
Das Backend SHALL alle bisherigen Single-Value-Filter auch als Multi-Value akzeptieren.

#### Scenario: Multiple difficulty values in API request
- **WHEN** `GET /api/recipes/?difficulty=easy&difficulty=medium` aufgerufen wird
- **THEN** werden Rezepte mit Schwierigkeit "easy" ODER "medium" zurückgegeben

#### Scenario: Multiple execution_time values
- **WHEN** `GET /api/recipes/?execution_time=less_30&execution_time=30_60` aufgerufen wird
- **THEN** werden Rezepte mit Dauer < 30 Min ODER 30-60 Min zurückgegeben

#### Scenario: Multiple recipe_type values
- **WHEN** `GET /api/recipes/?recipe_type=breakfast&recipe_type=warm_meal` aufgerufen wird
- **THEN** werden Frühstück ODER warme Mahlzeiten zurückgegeben

### Requirement: Active filter chips
Die Sidebar SHALL aktive Filter als Chips (Pills) mit einem "×"-Button zum Entfernen anzeigen.

#### Scenario: Active filter chip display
- **WHEN** ein Filter ausgewählt ist (z.B. Typ=Frühstück, Anzeigen=Community)
- **THEN** werden Chips "Frühstück" und "Community" über den Filtergruppen angezeigt
- **THEN** ein "Alle löschen"-Link daneben entfernt alle Filter

### Requirement: Reset button always visible
Ein "Zurücksetzen"-Button SHALL IMMER in der Sidebar sichtbar sein, nicht nur bei aktiven Filtern.

#### Scenario: Reset button always present
- **WHEN** die Filter-Sidebar gerendert wird
- **THEN** ist der "Zurücksetzen"-Button immer oben in der Sidebar sichtbar
- **THEN** der Button ist auch ohne aktive Filter klickbar (kein Effekt, konsistentes UI)

### Requirement: Bottom sheet drawer on mobile
Auf mobilen Geräten (< 768px) SHALL die Filter-Sidebar durch einen Bottom-Sheet-Drawer ersetzt werden.

#### Scenario: Mobile filter trigger button
- **WHEN** ein Nutzer die Rezeptsuche auf einem mobilen Gerät öffnet
- **THEN** wird ein "Filter"-Button mit Indikator der aktiven Filter-Anzahl über den Ergebnissen angezeigt

#### Scenario: Open bottom sheet
- **WHEN** der Nutzer auf "Filter" tippt
- **THEN** öffnet sich ein Bottom-Sheet-Drawer von unten mit allen Filtergruppen und dem "Zurücksetzen"-Button
- **THEN** ein "Anwenden"-Button am unteren Rand schließt den Drawer

#### Scenario: Bottom sheet close behavior
- **WHEN** der Nutzer "Anwenden" tippt oder den Overlay-Bereich antippt
- **THEN** schließt sich der Drawer und die Filter werden auf die Ergebnisse angewandt
