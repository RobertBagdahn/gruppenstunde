## ADDED Requirements

### Requirement: Einheitliche kcal-Anzeige von Energie

Das System SHALL Energie in der gesamten Nutzeroberfläche ausschließlich in Kilokalorien (kcal) anzeigen. Die Datenbank-Speicherung bleibt unverändert in Kilojoule (kJ); die Umrechnung erfolgt mit `kcal = kJ / 4,184` an der Anzeige-Grenze über einen zentralen Helper.

#### Scenario: Zutat-Nährwerte in kcal

- **WHEN** die Nährwerte einer Zutat angezeigt werden, deren `energy_kj` 1500 beträgt
- **THEN** wird "Energie: 359 kcal" (gerundet) statt "1500 kJ" angezeigt

#### Scenario: Mahlzeit-Nährwerte in kcal

- **WHEN** die Nährwert-Übersicht einer Mahlzeit angezeigt wird
- **THEN** sind Energie-Gesamtwert und Energie-pro-Portion in kcal mit Einheit "kcal" beschriftet

#### Scenario: Keine kJ-Anzeige mehr vorhanden

- **WHEN** eine beliebige Energie-Anzeige in der App gerendert wird (Zutat, Rezept, Mahlzeit, Plan, Simulator, Export)
- **THEN** wird die Einheit "kcal" verwendet und nirgends mehr "kJ" angezeigt

### Requirement: Energie-Regeln in kcal

Energie-bezogene Ampel-Regeln SHALL ihre Schwellwerte und Einheit in kcal führen. Bestehende `Rule`-Datensätze mit `parameter="energy_kj"` MUST per Daten-Migration von kJ auf kcal umgerechnet werden (Schwellwerte ÷ 4,184, `unit="kcal"`). Seed-Daten MUST kcal-Schwellwerte und kcal-Hinweistexte verwenden.

#### Scenario: Bestandsregel wird migriert

- **WHEN** vor der Migration eine Tagesregel "Energie" mit `min_green=8000`, `max_green=11000`, `unit="kJ"` existiert
- **THEN** hat sie nach der Migration `min_green≈1912`, `max_green≈2629`, `unit="kcal"`

#### Scenario: Seed erzeugt kcal-Regeln

- **WHEN** `seed_rules` nach der Umstellung ausgeführt wird
- **THEN** haben die Energie-Regeln `unit="kcal"` und kcal-Schwellwerte, und die `tip_text`-Texte nennen kcal-Werte statt kJ

### Requirement: Energie-Auswertung konsistent in kcal

Vor dem Vergleich gegen kcal-Schwellwerte SHALL das System den eingespeisten Energie-Wert (aus den in kJ gespeicherten Cache-Feldern) nach kcal konvertieren, sodass `Rule.evaluate()` Wert und Schwelle in derselben Einheit vergleicht. Die an das Frontend gelieferten Energie-Werte (`current_value`, `value_per_serving`, `threshold`) MUST in kcal vorliegen.

#### Scenario: Cockpit wertet Energie in kcal aus

- **WHEN** ein Tag einen aggregierten Energiewert von 9000 kJ hat und die Tagesregel `min_green≈1912`, `max_green≈2629` kcal lautet
- **THEN** wird `9000 / 4,184 ≈ 2151 kcal` ausgewertet und als grün eingestuft
- **AND** der an das Frontend gelieferte `current_value` beträgt ≈ 2151 mit `unit="kcal"`
