## ADDED Requirements

### Requirement: UnitConversion Model
The system SHALL provide a UnitConversion model with fields: from_unit, to_unit, factor (Decimal), and ingredient (optional FK for ingredient-specific densities).

#### Scenario: Generic unit conversion lookup
- **WHEN** a conversion is requested for from_unit and to_unit without a specific ingredient
- **THEN** the system SHALL return the generic conversion factor

#### Scenario: Ingredient-specific conversion takes priority
- **WHEN** a conversion is requested and both a generic and ingredient-specific conversion exist
- **THEN** the system SHALL return the ingredient-specific conversion factor

#### Scenario: Fallback to generic when no specific exists
- **WHEN** a conversion is requested for an ingredient that has no specific conversion but a generic one exists
- **THEN** the system SHALL fall back to the generic conversion factor

### Requirement: Unit Conversion API
The system SHALL provide GET /api/unit-conversions/?from_unit=&to_unit=&ingredient= for looking up conversion factors.

#### Scenario: Query with all parameters
- **WHEN** a client requests a conversion with from_unit, to_unit, and ingredient parameters
- **THEN** the system SHALL return the matching conversion factor using specific > generic fallback

#### Scenario: No conversion found
- **WHEN** no conversion exists for the given unit pair
- **THEN** the system SHALL return HTTP 404

### Requirement: Seed Data
Das System MUSS Seed-Daten für gängige deutsche Küchenumrechnungen enthalten (EL zu g, TL zu ml, Tasse zu ml, Prise zu g, etc.), die mit den korrigierten MeasuringUnit-Typen konsistent sind.

#### Scenario: Seed data available after migration
- **WHEN** die Data-Migration angewendet wurde
- **THEN** SHALL das System Standard-Umrechnungen für EL (15 ml→g), TL (5 ml→g), Tasse (250 ml→g), Prise, Messerspitze enthalten
- **AND** die Umrechnungen SHALL mit den korrigierten MeasuringUnit-Typen (`unit="ml"` für EL/TL/Tasse) konsistent sein

### Requirement: formatQuantity darf nicht auf 0 runden

#### Scenario: Eingabewert > 0
- **WHEN** `formatQuantity` mit einem Wert > 0 aufgerufen wird
- **THEN** darf das Ergebnis niemals "0 g" oder "0 ml" sein — mindestens eine Nachkommastelle wird angezeigt

### Requirement: Backend resolve_measuring_unit_name über Portion-Pfad

Die Funktion `resolve_measuring_unit_name` löst den Einheitsnamen für ein RecipeItem auf. Der Pfad ist immer `RecipeItem.portion.measuring_unit.name`. RecipeItem hat kein direktes `measuring_unit`-Feld — die Einheit kommt ausschließlich über die Portion-Beziehung.

#### Scenario: RecipeItem mit Portion die MeasuringUnit hat
- **WHEN** ein RecipeItem eine `portion` hat und diese Portion eine `measuring_unit` zugeordnet hat
- **THEN** gibt `resolve_measuring_unit_name` den `measuring_unit.name` der Portion zurück

#### Scenario: RecipeItem mit Portion ohne MeasuringUnit
- **WHEN** ein RecipeItem eine `portion` hat aber diese Portion keine `measuring_unit` hat
- **THEN** gibt `resolve_measuring_unit_name` NULL zurück

## REMOVED Requirements

### Requirement: Fehlende Küchenmaßeinheiten

**Reason**: „Handvoll" und „Tropfen" wurden nie als MeasuringUnit angelegt und passen nicht in das bereinigte System (Handvoll ist eine Formbeschreibung, Tropfen ist extrem spezifisch mit vernachlässigbarem Nutzen).

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
- **WHEN** ein Client `POST /api/unit-conversions/available/batch/` mit einer Liste von `{ingredient_id, from_unit_id, quantity}` aufruft
- **THEN** MUSS das System die Umrechnungen für alle angefragten Zutaten in einer Response zurückgeben

#### Scenario: Keine Umrechnungen verfügbar
- **WHEN** für eine Zutat+Einheit-Kombination keine Umrechnungen existieren
- **THEN** MUSS das System eine leere `conversions` Liste zurückgeben (kein Fehler)

#### Scenario: Nicht-konvertierbare Einheit
- **WHEN** die Quell-Einheit keinen konvertierbaren Typ hat (weder g noch ml)
- **THEN** MUSS das System eine leere `conversions` Liste zurückgeben
