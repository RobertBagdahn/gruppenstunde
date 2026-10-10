## ADDED Requirements

### Requirement: Mengen im RefMeal-Editor nach quantity-units
Der RefMeal-Editor SHALL Zutatenmengen nach `quantity-units` anzeigen und bearbeiten (gespeicherte Einheit, Gramm immer sichtbar, dynamische Ansicht). Dezimalmengen MUST NOT gerundet werden. `RefMealItemIn` SHALL `portion_id` und `standard_measure_key` annehmen, und das Synchronisieren MUST Einheit und Anzahl auf verknüpfte Mahlzeiten übertragen.

#### Scenario: Halbe Portion
- **GIVEN** ein RefMeal-Eintrag 0,5 × „Portion“ (30 g) Frischkäse
- **WHEN** der Editor geöffnet wird
- **THEN** SHALL „0,5 Portion (15 g)“ erscheinen und nicht „1 Gramm“

#### Scenario: Synchronisieren übernimmt Einheit
- **GIVEN** ein RefMeal-Eintrag „2 Stück“ Brötchen
- **WHEN** ein angemeldeter Nutzer mit Bearbeitungsrecht „Für alle übernehmen“ ausführt
- **THEN** SHALL jede verknüpfte Mahlzeit den Eintrag mit Portion „Stück“ und `quantity = 2` erhalten

#### Scenario: Ohne Bearbeitungsrecht
- **WHEN** ein Nutzer ohne Bearbeitungsrecht den Editor öffnet
- **THEN** SHALL er Mengen umschaltbar sehen, aber nicht bearbeiten können
