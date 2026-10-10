## REMOVED Requirements

### Requirement: Standardmengen werden nicht persistiert
**Reason**: Nutzer wollen dauerhaft in EL, TL, Prise usw. planen. Die sofortige Umrechnung in Gramm verliert die Absicht.
**Migration**: Ersetzt durch „Standardmaß als gespeicherte Einheit“. Bestehende Einträge in Gramm bleiben Gramm.

## ADDED Requirements

### Requirement: Standardmaß als gespeicherte Einheit
Die Auswahl eines Standardmaßes SHALL keine neue `Portion` anlegen. Stattdessen SHALL der Eintrag `standard_measure_key` mit der Anzahl als `quantity` speichern (`RecipeItem`: verankert an der „g“-Basisportion der Zutat). Das Gewicht MUST bei jeder Berechnung aus Katalog und aktueller Zutatendichte entstehen, über eine gemeinsame Backend-Funktion, die auch `GET /api/supply/ingredients/{slug}/standard-measures/` nutzt. Unbekannte Schlüssel MUST mit 422 abgelehnt werden.

#### Scenario: EL gewählt
- **GIVEN** ein angemeldeter Nutzer mit Bearbeitungsrecht
- **WHEN** er für Olivenöl (Dichte 0,92) „1 EL“ wählt
- **THEN** wird keine neue Portion angelegt
- **AND** der Eintrag speichert `standard_measure_key = "el"`, `quantity = 1` und liefert `quantity_g = 13.8`

#### Scenario: Dichte ändert sich später
- **GIVEN** ein Eintrag 2 × TL Honig ohne explizite Dichte (≈ 10 g)
- **WHEN** die Dichte von Honig auf 1,4 gesetzt wird
- **THEN** SHALL der Eintrag „2 TL (14 g)“ zeigen

#### Scenario: Unbekannter Schlüssel
- **WHEN** ein Request `standard_measure_key = "becher"` sendet
- **THEN** MUST die API mit 422 antworten
