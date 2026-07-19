## ADDED Requirements

### Requirement: Bereinigte MeasuringUnit-Referenzdaten

Das System SHALL genau 10 MeasuringUnit-Datensätze mit korrekten Typen und Umrechnungsfaktoren bereitstellen.

#### Scenario: Gramm als Basis-Masseneinheit
- **WHEN** die MeasuringUnit „Gramm" abgefragt wird
- **THEN** SHALL `unit` `"g"` sein und `quantity` `1.0`

#### Scenario: Kilogramm als abgeleitete Masseneinheit
- **WHEN** die MeasuringUnit „Kilogramm" abgefragt wird
- **THEN** SHALL `unit` `"g"` sein und `quantity` `1000.0`

#### Scenario: Milliliter als Basis-Volumeneinheit
- **WHEN** die MeasuringUnit „Milliliter" abgefragt wird
- **THEN** SHALL `unit` `"ml"` sein und `quantity` `1.0`

#### Scenario: Liter als abgeleitete Volumeneinheit
- **WHEN** die MeasuringUnit „Liter" abgefragt wird
- **THEN** SHALL `unit` `"ml"` sein und `quantity` `1000.0`

#### Scenario: Esslöffel als Volumeneinheit
- **WHEN** die MeasuringUnit „Esslöffel" abgefragt wird
- **THEN** SHALL `unit` `"ml"` sein und `quantity` `15.0`

#### Scenario: Teelöffel als Volumeneinheit
- **WHEN** die MeasuringUnit „Teelöffel" abgefragt wird
- **THEN** SHALL `unit` `"ml"` sein und `quantity` `5.0`

#### Scenario: Prise als Masseneinheit
- **WHEN** die MeasuringUnit „Prise" abgefragt wird
- **THEN** SHALL `unit` `"g"` sein und `quantity` `0.3`

#### Scenario: Messerspitze als Masseneinheit
- **WHEN** die MeasuringUnit „Messerspitze" abgefragt wird
- **THEN** SHALL `unit` `"g"` sein und `quantity` `1.0`

#### Scenario: Tasse als Volumeneinheit
- **WHEN** die MeasuringUnit „Tasse" abgefragt wird
- **THEN** SHALL `unit` `"ml"` sein und `quantity` `250.0`

#### Scenario: Schuss als Volumeneinheit
- **WHEN** die MeasuringUnit „Schuss" abgefragt wird
- **THEN** SHALL `unit` `"ml"` sein und `quantity` `10.0`

### Requirement: Duplikate werden zusammengeführt

Das System SHALL keine semantisch äquivalenten MeasuringUnits mit unterschiedlichen Namen enthalten.

#### Scenario: g nach Gramm migriert
- **WHEN** die Data-Migration angewendet wurde
- **THEN** SHALL kein MeasuringUnit-Record mit Namen „g" existieren
- **AND** SHALL jede Portion, die zuvor „g" referenzierte, nun „Gramm" referenzieren

#### Scenario: ml nach Milliliter migriert
- **WHEN** die Data-Migration angewendet wurde
- **THEN** SHALL kein MeasuringUnit-Record mit Namen „ml" existieren
- **AND** SHALL jede Portion, die zuvor „ml" referenzierte, nun „Milliliter" referenzieren

### Requirement: Form-/Verpackungseinheiten werden entfernt

Das System SHALL keine MeasuringUnits enthalten, die physische Formen oder Verpackungen statt standardisierter Messeinheiten beschreiben. Betroffene Einheiten: Stück, Packung, Portion, Scheibe, Dose, Glas, Becher, Bund.

#### Scenario: Stück aus MeasuringUnit entfernt
- **WHEN** die Data-Migration angewendet wurde
- **THEN** SHALL kein MeasuringUnit-Record mit Namen „Stück" existieren
- **AND** SHALL jede Portion, die zuvor „Stück" referenzierte, nun „Gramm" referenzieren

#### Scenario: Form-Einheiten aus MeasuringUnit entfernt
- **WHEN** die Data-Migration angewendet wurde
- **THEN** SHALL kein MeasuringUnit-Record mit Namen „Scheibe", „Dose", „Glas", „Becher", „Bund", „Packung" oder „Portion" existieren
- **AND** SHALL alle zugehörigen Portion-FK-Referenzen auf „Gramm" migriert sein

### Requirement: KI-Knowledge referenziert nur existierende MeasuringUnits

Die Datei `portion_knowledge.py` SHALL nur Einheiten in `TYPICAL_UNIT_WEIGHTS` enthalten, die als MeasuringUnit in der Datenbank existieren.

#### Scenario: TYPICAL_UNIT_WEIGHTS enthält keine Phantom-Einheiten
- **WHEN** `portion_knowledge.py` geladen wird
- **THEN** SHALL `TYPICAL_UNIT_WEIGHTS` keine Einträge für „Spitzer", „Ei" oder andere nicht als MeasuringUnit existierende Namen enthalten
- **AND** SHALL jeder Eintrag einem existierenden `MeasuringUnit.name` entsprechen

### Requirement: Unit-Resolution-Synonyme sind aktuell

Die Synonym-Map in `unit_resolution.py` SHALL nur auf existierende MeasuringUnit-Namen verweisen.

#### Scenario: Synonyme zeigen auf existierende Einheiten
- **WHEN** ein freier Einheitentext über `SYNONYMS` aufgelöst wird
- **THEN** SHALL der Ziel-Name ein existierender `MeasuringUnit.name` sein
- **AND** SHALL kein Synonym auf „g", „ml", „Stück", „Packung", „Portion", „Spitzer" oder andere gelöschte Einheiten verweisen

### Requirement: Master-Fixture ist aktuell

Das Master-Seed-Fixture `backend/data/masterdata/supply_measuringunit.json` SHALL genau die 10 bereinigten MeasuringUnits enthalten.

#### Scenario: Fixture enthält nur bereinigte Einheiten
- **WHEN** das Fixture geladen wird
- **THEN** SHALL es genau 10 Einträge enthalten
- **AND** SHALL jeder Eintrag korrekte `unit`- und `quantity`-Werte gemäß dieser Spec haben

### Requirement: Dropdown-Anzeige mit formatiertem Einheitentext

Das Frontend SHALL im Portion-Edit-Dropdown jede MeasuringUnit mit formatiertem Text anzeigen: `{name} ({formatted_quantity} {unit_abbrev})`. Deutsche Dezimaltrennzeichen (Komma).

#### Scenario: Anzeige einer abgeleiteten Einheit
- **WHEN** das MeasuringUnit-Dropdown gerendert wird
- **THEN** SHALL der Eintrag für „Esslöffel" als „Esslöffel (15 ml)" angezeigt werden

#### Scenario: Anzeige einer Base-Unit ohne Faktor
- **WHEN** das MeasuringUnit-Dropdown gerendert wird
- **THEN** SHALL der Eintrag für „Gramm" (quantity=1.0) nur als „Gramm" ohne Faktor in Klammern angezeigt werden
- **AND** der Eintrag für „Milliliter" (quantity=1.0) nur als „Milliliter"

#### Scenario: Deutsche Dezimaltrennzeichen
- **WHEN** ein quantity-Wert nicht ganzzahlig ist
- **THEN** SHALL der Dezimalpunkt als deutsches Komma formatiert werden („0,3 g" statt „0.3 g")

### Requirement: Dropdown-Sortierung nach Küchenrelevanz

Das Frontend SHALL das MeasuringUnit-Dropdown statisch nach Küchenrelevanz sortiert anzeigen.

#### Scenario: Sortierreihenfolge
- **WHEN** das MeasuringUnit-Dropdown gerendert wird
- **THEN** SHALL die Reihenfolge sein: Gramm, Kilogramm, Milliliter, Liter, Esslöffel, Teelöffel, Prise, Messerspitze, Tasse, Schuss

### Requirement: UnitConversion-Bereinigung

Das System SHALL vor dem Löschen von MeasuringUnit-Records alle UnitConversion-Records bereinigen, die auf gelöschte Units verweisen.

#### Scenario: Keine Dangling-Referenzen in UnitConversion
- **WHEN** die Data-Migration abgeschlossen ist
- **THEN** SHALL kein UnitConversion-Record existieren, dessen `from_unit_id` oder `to_unit_id` auf einen gelöschten MeasuringUnit-Record verweist
