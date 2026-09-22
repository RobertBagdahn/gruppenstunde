## ADDED Requirements

### Requirement: Fester Standardmengen-Katalog

Das System SHALL einen festen Katalog an Standardmengen mit den Eintraegen `EL` (15 ml), `TL` (5 ml), `Tasse` (200 ml), `Prise` (0,5 g) und `Msp` (0,2 g) als serverseitige Daten (`supply/data/standard_measures.py`) pflegen. Der Katalog SHALL ohne DB-Migration erweiterbar sein.

#### Scenario: Katalog ist vollstaendig
- **WHEN** der Katalog geladen wird
- **THEN** enthaelt er mindestens die Eintraege EL, TL, Tasse, Prise und Msp

#### Scenario: Erweiterung ohne Migration
- **WHEN** ein neuer Eintrag (z. B. "Becher") ergaenzt wird
- **THEN** sind keine neuen Datenbank-Migrationen noetig

### Requirement: API liefert Standardmengen pro Zutat

Der Endpoint `GET /api/ingredients/{slug}/standard-measures/` SHALL den Katalog mit fuer die Zutat berechneten Gramm-Werten als `list[StandardMeasureOut]` zurueckgeben. Die Route SHALL vor parametrisierten Catch-all-Routen registriert sein.

#### Scenario: Zutat mit Dichte
- **WHEN** eine Zutat mit explizit gesetzter Dichte (`physical_density: 0.8`, abweichend vom Default 1.0) den Katalog laedt
- **THEN** erhaelt der Eintrag `EL` den Wert `12.0` g mit `is_approx: false`

#### Scenario: Zutat ohne explizite Dichte
- **WHEN** eine Zutat mit Dichte-Default 1.0 (nicht explizit gesetzt) den Katalog laedt
- **THEN** erhaelt `EL` den generischen Wert (15 g) mit `is_approx: true`

#### Scenario: Unbekannte Zutat
- **WHEN** der Endpoint mit einem nicht existierenden Slug aufgerufen wird
- **THEN** antwortet die API mit HTTP 404

#### Scenario: Zugriff ohne Authentifizierung
- **WHEN** ein anonymer Nutzer den Katalog einer oeffentlichen Zutat laedt
- **THEN** antwortet die API mit HTTP 200 (Referenzdaten, keine Session noetig)

### Requirement: Pydantic- und Zod-Schema synchron

Das Response-Schema `StandardMeasureOut` (Pydantic in `supply/schemas/ingredients.py`) und das entsprechende Zod-Schema in `frontend-food/src/schemas/supply.ts` SHALL dieselben Felder und Typen aufweisen (`key`, `name`, `grams`, `unit_name`, `is_approx`).

#### Scenario: Feldmengen sind identisch
- **WHEN** beide Schemas verglichen werden
- **THEN** Feldnamen und Typen stimmen ueberein

### Requirement: Standardmengen werden nicht persistiert

Die Auswahl einer Standardmenge im Picker SHALL keine neue `Portion` in der Datenbank anlegen. Das Item SHALL auf die `g`-Fallback-Portion der Zutat (bzw. `portion_id: null`) wechseln, und die Menge SHALL auf die berechneten Gramm gesetzt werden.

#### Scenario: Standardmenge gewaehlt
- **WHEN** der Nutzer "1 EL" fuer eine Zutat mit Dichte waehlt
- **THEN** wird keine neue Portion angelegt
- **THEN** traegt das Item die berechnete Gramm-Menge ein (ueber `g`-Portion oder `portion_id: null`)
- **THEN** der Picker kennzeichnet den Eintrag beim Auswaehlen mit "ca.", sofern der Wert generisch ist
