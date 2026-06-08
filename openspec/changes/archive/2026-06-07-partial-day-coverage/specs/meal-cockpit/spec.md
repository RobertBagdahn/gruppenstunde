# meal-cockpit Specification (Delta)

## ADDED Requirements

### Requirement: Coverage-skalierte day-level Regelauswertung

Das Suggestion-System SHALL bei der Auswertung von day-level HealthRules die effektive Tagesabdeckung (`effectiveCoverage`) berücksichtigen. Die Schwellwerte der Regel (min_green, max_green, min_yellow, max_yellow) werden mit `effectiveCoverage` multipliziert, bevor die Regel gegen den aggregierten Tageswert ausgewertet wird.

#### Scenario: Protein-Regel an Tag mit 50% Coverage

- **WHEN** eine day-level Regel "protein_g: min_green=45, min_yellow=35" ausgewertet wird
- **AND** der Tag hat 50% Coverage (effectiveCoverage = 0.50)
- **THEN** werden die Schwellwerte skaliert: min_green=22.5, min_yellow=17.5
- **THEN** wird der Ist-Wert (z.B. 30g) gegen die skalierten Schwellwerte ausgewertet

#### Scenario: Energie-Regel an Tag mit 25% Coverage (Floor greift)

- **WHEN** eine day-level Regel "energy_kj: max_green=10500, max_yellow=13000" ausgewertet wird
- **AND** der Tag hat 25% Coverage (effectiveCoverage = max(0.25, 0.35) = 0.35)
- **THEN** werden die Schwellwerte skaliert: max_green=3675, max_yellow=4550
- **THEN** der Floor von 35% verhindert übermäßige Skalierung

#### Scenario: Vollständiger Tag ohne Skalierung

- **WHEN** eine day-level Regel an einem Tag mit 100% Coverage ausgewertet wird
- **THEN** werden die Schwellwerte NICHT skaliert (effektiv × 1.0)

### Requirement: Coverage-Information im Suggestion-Response

Das Suggestion-System SHALL für jeden day-level Vorschlag einen `coverage`-Wert im Response mitliefern, sodass das Frontend den Coverage-Kontext anzeigen kann.

#### Scenario: Suggestion-Card zeigt Coverage

- **WHEN** eine day-level Suggestion-Card im Vorschläge-Tab angezeigt wird
- **THEN** zeigt die Card einen Coverage-Badge mit der Tagesabdeckung
- **THEN** bei skalierter Regel wird ein Hinweis "Skaliert auf X % Tagesabdeckung" angezeigt

## MODIFIED Requirements

### Requirement: Tages- und Plan-Aggregation in Normportion-Logik

- **AND** bei scope="day"-Regelauswertung MÜSSEN die Schwellwerte mit `effectiveCoverage` multipliziert werden

### Requirement: Suggestion evaluation service

- **AND** bei der Evaluierung von day-scope Regeln MUSS der Service die Tagesabdeckung (`sum(day_part_factor)` der Mahlzeiten) berechnen und die Schwellwerte entsprechend skalieren
