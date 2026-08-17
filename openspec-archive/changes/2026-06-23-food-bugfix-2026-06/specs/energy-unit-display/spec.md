## MODIFIED Requirements

### Requirement: Einheitliche kcal-Anzeige von Energie

Das System SHALL Energie in der gesamten Nutzeroberfläche und Datenbank ausschließlich in Kilokalorien (kcal) speichern und anzeigen. Es gibt keine kJ-Speicherung und keine Konvertierungsfunktionen mehr. Alle Energie-Felder heißen `*_kcal`.

Das Eingabeformular für Zutaten (IngredientCreatePage) SHALL das Energie-Eingabefeld eindeutig mit „Energie (kcal)" beschriften. Das bisherige Label „Energie (kJ)" war falsch und hat zu potenziell falschen gespeicherten Werten geführt.

#### Scenario: Zutat-Nährwerte in kcal

- **WHEN** die Nährwerte einer Zutat angezeigt werden, deren `energy_kcal` 358 beträgt
- **THEN** wird „Energie: 358 kcal" angezeigt

#### Scenario: Energie-Eingabefeld korrekt beschriftet

- **WHEN** ein Nutzer eine neue Zutat anlegt oder bearbeitet
- **THEN** ist das Energie-Feld mit „Energie (kcal)" beschriftet
- **THEN** gibt es kein Feld mit der Beschriftung „Energie (kJ)"

#### Scenario: Mahlzeit-Nährwerte in kcal

- **WHEN** die Nährwert-Übersicht einer Mahlzeit angezeigt wird
- **THEN** sind Energie-Gesamtwert und Energie-pro-Portion in kcal mit Einheit „kcal" beschriftet
- **THEN** es findet keine Konvertierung von kJ nach kcal statt (Werte sind bereits kcal)

#### Scenario: Keine kJ-Anzeige mehr vorhanden

- **WHEN** eine beliebige Energie-Anzeige in der App gerendert wird (Zutat, Rezept, Mahlzeit, Plan, Simulator, Export)
- **THEN** wird die Einheit „kcal" verwendet und nirgends mehr „kJ" angezeigt

#### Scenario: Energie-Regeln in kcal

- **WHEN** eine Energie-Ampel-Regel angezeigt oder ausgewertet wird
- **THEN** verwendet sie `parameter="energy_kcal"` und kcal-Schwellwerte
