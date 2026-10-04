# standard-measure-catalog Specification

## Purpose
Fixed catalog of standard kitchen measures (EL, TL, Tasse, Prise, Msp) with density-based gram amounts, served via API for display only.
## Requirements
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

### Requirement: Standardmaß-API liefert Volumen zur eindeutigen Beschriftung
Das Response-Schema `StandardMeasureOut` SHALL für volumenbasierte Standardmaße zusätzlich `volume_ml` als Zahl und für reine Massenmaße `null` liefern. Das entsprechende Zod-Schema SHALL dasselbe Feld und dieselbe Null-Semantik verwenden.

#### Scenario: Tasse sichtbar von Zutaten-Portion unterscheiden
- **GIVEN** der Katalog liefert die Standardtasse mit 200 ml und eine Zutaten-Portion heißt ebenfalls „Tasse“
- **WHEN** beide Auswahloptionen angezeigt werden
- **THEN** die Standardmenge SHALL „1 Tasse (200 ml)“ und die Zutaten-Portion SHALL ihren eigenen Namen und ihr Gewicht zeigen

#### Scenario: Massenmaß ohne Volumen
- **GIVEN** ein Standardmaß ist massenbasiert und hat kein Volumen
- **WHEN** die API es serialisiert
- **THEN** SHALL `volume_ml` null sein

### Requirement: Standardmaß und Zutaten-Portion verwenden eine nachvollziehbare gemeinsame Umrechnung
Das System SHALL bei der Umrechnung zwischen Standardmaß und Zutaten-Portion denselben zugrunde liegenden Grammwert verwenden. Eine Umrechnung SHALL die physische Menge erhalten; unterschiedliche Bezeichnungen oder Portionsgrößen dürfen keine unerklärte Mengenänderung erzeugen. Gleichzeitig angebotene Optionen mit gleicher Bezeichnung und unterschiedlichen Grammwerten MUST entweder fachlich unterscheidbar beschriftet oder als Duplikat entfernt werden.

#### Scenario: Tassenmenge behält Masse bei
- **GIVEN** eine Zutatenmenge wird als Standardmaß „Tasse“ erfasst und anschließend als Zutaten-Portion dargestellt
- **WHEN** beide Darstellungen in Gramm umgerechnet werden
- **THEN** SHALL die zugrunde liegende Masse bis auf die dokumentierte Rundungsgenauigkeit gleich bleiben

#### Scenario: Doppelte Maßnamen sind unterscheidbar
- **GIVEN** eine Zutat hat ein Standardmaß „Tasse“ und eine eigene Portion mit dem Namen „Tasse“ und abweichendem Gewicht
- **WHEN** beide Optionen im Mengen-Dialog angeboten werden
- **THEN** SHALL die Anzeige die unterschiedlichen Größen eindeutig benennen oder eine der fachlich redundanten Optionen ausblenden

#### Scenario: Volumenmaß mit bekannter Dichte
- **GIVEN** eine Zutat hat eine explizite Dichte
- **WHEN** ein Standard-Volumenmaß in eine Zutaten-Portion umgerechnet wird
- **THEN** SHALL die Dichte genau einmal angewendet werden und die angezeigte Gramm-Äquivalenz der gespeicherten Menge entsprechen
