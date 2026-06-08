## MODIFIED Requirements

### Requirement: Einheitliche kcal-Anzeige von Energie

Das System SHALL Energie in der gesamten Nutzeroberfläche und Datenbank ausschließlich in Kilokalorien (kcal) speichern und anzeigen. Es gibt keine kJ-Speicherung und keine Konvertierungsfunktionen mehr. Alle Energie-Felder heißen `*_kcal`.

#### Scenario: Zutat-Nährwerte in kcal

- **WHEN** die Nährwerte einer Zutat angezeigt werden, deren `energy_kcal` 358 beträgt
- **THEN** wird "Energie: 358 kcal" angezeigt

#### Scenario: Mahlzeit-Nährwerte in kcal

- **WHEN** die Nährwert-Übersicht einer Mahlzeit angezeigt wird
- **THEN** sind Energie-Gesamtwert und Energie-pro-Portion in kcal mit Einheit "kcal" beschriftet
- **THEN** es findet keine Konvertierung von kJ nach kcal statt (Werte sind bereits kcal)

#### Scenario: Keine kJ-Anzeige mehr vorhanden

- **WHEN** eine beliebige Energie-Anzeige in der App gerendert wird (Zutat, Rezept, Mahlzeit, Plan, Simulator, Export)
- **THEN** wird die Einheit "kcal" verwendet und nirgends mehr "kJ" angezeigt

### Requirement: Energie-Regeln in kcal

Energie-bezogene Ampel-Regeln SHALL ihre Schwellwerte und Einheit in kcal führen. Der Parameter-Key lautet `"energy_kcal"`. Bestehende `Rule`-Datensätze mit `parameter="energy_kj"` MUST per Daten-Migration auf `parameter="energy_kcal"` umbenannt werden. Seed-Daten MUST `parameter="energy_kcal"` und kcal-Schwellwerte verwenden.

#### Scenario: Bestandsregel wird migriert

- **WHEN** eine Regel mit `parameter="energy_kj"` und `unit="kcal"` existiert
- **THEN** hat sie nach der Migration `parameter="energy_kcal"` bei unveränderten Schwellwerten und `unit`

#### Scenario: Seed erzeugt kcal-Regeln

- **WHEN** `seed_rules` nach der Umstellung ausgeführt wird
- **THEN** haben die Energie-Regeln `parameter="energy_kcal"`, `unit="kcal"` und kcal-Schwellwerte

### Requirement: Energie-Auswertung konsistent in kcal

Das System SHALL Energie-Werte direkt in kcal aus den Cache-Feldern lesen und ohne Konvertierung in `Rule.evaluate()` einspeisen. Da sowohl gespeicherte Werte als auch Schwellwerte in kcal vorliegen, ist keine Umrechnung nötig. Die an das Frontend gelieferten Energie-Werte (`current_value`, `value_per_serving`, `threshold`) MUST in kcal vorliegen.

#### Scenario: Cockpit wertet Energie in kcal aus

- **WHEN** ein Tag einen aggregierten Energiewert von 2151 kcal hat und die Tagesregel `min_green=1912`, `max_green=2629` kcal lautet
- **THEN** wird 2151 kcal direkt (ohne Konvertierung) ausgewertet und als grün eingestuft
- **AND** der an das Frontend gelieferte `current_value` beträgt 2151 mit `unit="kcal"`
