# unit-conversion Specification

## Purpose
Anforderungen an unit conversion: UnitConversion Model; Unit Conversion API; Seed Data.

## Requirements
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
Das System MUST Seed-Daten für gängige deutsche Küchenumrechnungen enthalten (EL zu g, TL zu ml, Tasse zu ml, Prise zu g, etc.), die mit den korrigierten MeasuringUnit-Typen konsistent sind.

#### Scenario: Seed data available after migration
- **WHEN** die Data-Migration angewendet wurde
- **THEN** SHALL das System Standard-Umrechnungen für EL (15 ml→g), TL (5 ml→g), Tasse (250 ml→g), Prise, Messerspitze enthalten
- **AND** die Umrechnungen SHALL mit den korrigierten MeasuringUnit-Typen (`unit="ml"` für EL/TL/Tasse) konsistent sein

### Requirement: formatQuantity darf nicht auf 0 runden
`formatQuantity` MUST NOT format a value greater than 0 as "0 g" or "0 ml"; it SHALL show at least one decimal place instead.

#### Scenario: Eingabewert > 0
- **WHEN** `formatQuantity` mit einem Wert > 0 aufgerufen wird
- **THEN** darf das Ergebnis niemals "0 g" oder "0 ml" sein — mindestens eine Nachkommastelle wird angezeigt

### Requirement: Backend resolve_measuring_unit_name über Portion-Pfad

Die Funktion `resolve_measuring_unit_name` löst den Einheitsnamen für ein RecipeItem auf. Der Pfad MUST immer `RecipeItem.portion.measuring_unit.name` sein. RecipeItem hat kein direktes `measuring_unit`-Feld — die Einheit kommt ausschließlich über die Portion-Beziehung.

#### Scenario: RecipeItem mit Portion die MeasuringUnit hat
- **WHEN** ein RecipeItem eine `portion` hat und diese Portion eine `measuring_unit` zugeordnet hat
- **THEN** gibt `resolve_measuring_unit_name` den `measuring_unit.name` der Portion zurück

#### Scenario: RecipeItem mit Portion ohne MeasuringUnit
- **WHEN** ein RecipeItem eine `portion` hat aber diese Portion keine `measuring_unit` hat
- **THEN** gibt `resolve_measuring_unit_name` NULL zurück

### Requirement: Zutat-spezifische Umrechnungsfaktoren
Das System MUST zutat-spezifische UnitConversion-Einträge für mindestens 30 gängige Zutaten seeden, die abweichende Dichten bei Volumen-zu-Masse-Umrechnungen abbilden.

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
Das System MUST einen GET-Endpunkt `/api/unit-conversions/available/` bereitstellen, der alle möglichen Ziel-Einheiten mit umgerechneten Mengen zurückgibt.

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

### Requirement: Löffel-Portionen werden am Namen erkannt
Die Mengenumrechnung SHALL eine Portion als EL/TL/Prise/Msp erkennen, wenn ihr normalisierter Name damit beginnt (`1 TL (2g)`, `1 EL (10ml)`, `Esslöffel`). Der Name der Maßeinheit MUST nur gelten, wenn der Portionsname keine andere Einheit nennt.

#### Scenario: TL-Portion mit Gewicht im Namen
- **GIVEN** `Knoblauchpulver` hat die Portion `1 TL (2g)`
- **WHEN** `1 TL Knoblauchpulver` umgerechnet wird
- **THEN** ergibt sich 1 × `1 TL (2g)` = 2 g

#### Scenario: ml-Portion mit falscher Maßeinheit
- **GIVEN** `Limettensaft` hat die Portion `200 ml` mit Maßeinheit „Esslöffel“
- **WHEN** `1 EL Limettensaft` umgerechnet wird
- **THEN** wird die Portion `200 ml` nicht als Esslöffel gezählt und das Ergebnis liegt bei 15 g

### Requirement: Größenangaben bei Stückportionen
Bei Stück-Einheiten SHALL die Umrechnung eine Stückportion mit passender Größe wählen (`kleines Stück` für `klein`, `großes Stück` für `groß`). Fehlt sie, MUST das Gewicht der normalen Stückportion skaliert werden (klein × 0,6, groß × 1,4). Ohne Größenangabe MUST eine normale (nicht „kleine“) Stückportion bevorzugt werden.

#### Scenario: Große Zwiebeln
- **WHEN** `3 große Zwiebel(n)` umgerechnet wird und die Zutat `Stück` (100 g) und `kleines Stück` (50 g) hat
- **THEN** ergibt sich 420 g

### Requirement: Standardgewichte ohne KI
Für Stück- und Gebinde-Einheiten ohne passende Portion SHALL die Umrechnung zuerst eine Tabelle typischer Gewichte verwenden (u. a. Zehe 5 g, Bund Kräuter 20 g, Topf Kräuter 25 g, Zweig 1 g, Stiel 1 g, Blatt 0,4 g, Stange Lauch 200 g, Knolle Sellerie 700 g, Pck. Backpulver 16 g, Pck. Vanillezucker 8 g, Glas Wein 150 ml, Dose Tomaten 400 g) sowie typische Stückgewichte je Zutat. Gemini MUST erst danach und nur für angemeldete Nutzer gefragt werden.

#### Scenario: Bund Rosmarin
- **WHEN** `1 Bund Rosmarin` ohne Bund-Portion umgerechnet wird
- **THEN** ergibt sich 20 g ohne KI-Aufruf

#### Scenario: Prise
- **WHEN** `1 Prise Salz` umgerechnet wird
- **THEN** ergibt sich 0,5 g

### Requirement: Dichte nach Kategorie
Ist für eine Zutat keine eigene Dichte gepflegt (Wert 1,0), SHALL die Volumenumrechnung eine Kategorie-Dichte verwenden: Pulver und gemahlene Gewürze 0,5, Öle 0,92, Honig und Sirup 1,4, Zucker 0,85, Mehl 0,55, sonst 1,0.

#### Scenario: Cayennepfeffer
- **WHEN** `1 TL Cayennepfeffer` ohne passende Portion umgerechnet wird
- **THEN** ergibt sich 2,5 g
