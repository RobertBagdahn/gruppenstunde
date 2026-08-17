## ADDED Requirements

### Requirement: Fehlende Küchenmaßeinheiten
Das System MUSS folgende MeasuringUnits als Seed-Daten bereitstellen: Handvoll (30g, Masse), Tropfen (0.05ml, Volumen).

#### Scenario: MeasuringUnits nach Migration verfügbar
- **WHEN** die Data-Migration angewendet wurde
- **THEN** MÜSSEN die MeasuringUnits "Handvoll" und "Tropfen" in der Datenbank existieren

### Requirement: Zutat-spezifische Umrechnungsfaktoren
Das System MUSS zutat-spezifische UnitConversion-Einträge für mindestens 30 gängige Zutaten seeden, die abweichende Dichten bei Volumen-zu-Masse-Umrechnungen abbilden.

#### Scenario: Tasse Reis vs. Tasse Mehl
- **WHEN** "1 Tasse" für Reis umgerechnet wird
- **THEN** MUSS das Ergebnis ca. 185g sein (nicht 250g wie generisch)

#### Scenario: Tasse Mehl
- **WHEN** "1 Tasse" für Mehl umgerechnet wird
- **THEN** MUSS das Ergebnis ca. 125g sein

#### Scenario: EL Butter
- **WHEN** "1 EL" für Butter umgerechnet wird
- **THEN** MUSS das Ergebnis ca. 12g sein (nicht 15g wie generisch)

### Requirement: API-Endpunkt für verfügbare Umrechnungen
Das System MUSS einen GET-Endpunkt `/api/unit-conversions/available/` bereitstellen, der alle möglichen Ziel-Einheiten mit umgerechneten Mengen zurückgibt.

#### Scenario: Abfrage mit Zutat und Quell-Einheit
- **WHEN** ein Client `GET /api/unit-conversions/available/?ingredient_id=42&from_unit_id=1&quantity=200` aufruft
- **THEN** MUSS das System eine Liste aller möglichen Umrechnungen mit `to_unit_id`, `to_unit_name`, `quantity` und `is_ingredient_specific` zurückgeben

#### Scenario: Batch-Abfrage für mehrere Zutaten
- **WHEN** ein Client `GET /api/unit-conversions/available/batch/` mit einer Liste von `{ingredient_id, from_unit_id, quantity}` aufruft
- **THEN** MUSS das System die Umrechnungen für alle angefragten Zutaten in einer Response zurückgeben

#### Scenario: Keine Umrechnungen verfügbar
- **WHEN** für eine Zutat+Einheit-Kombination keine Umrechnungen existieren
- **THEN** MUSS das System eine leere `conversions` Liste zurückgeben (kein Fehler)

#### Scenario: Nicht-konvertierbare Einheit
- **WHEN** die Quell-Einheit keinen konvertierbaren Typ hat (weder g noch ml)
- **THEN** MUSS das System eine leere `conversions` Liste zurückgeben
