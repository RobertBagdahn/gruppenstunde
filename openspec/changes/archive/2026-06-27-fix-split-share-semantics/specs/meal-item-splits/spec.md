## MODIFIED Requirements

### Requirement: Split als Anteil gespeichert

Das System SHALL Portionen-Splits als float-Anteile (0.0–1.0) in `MealItemSplit` speichern. Die Constraint `Σ share = 1.0` MUST vom Backend für Exchange-Gruppen erzwungen werden. Für optionale Zutaten repräsentiert `share` den Inklusions-Anteil (0.0–1.0); es gibt keine Σ=1.0-Anforderung. Der DB-CheckConstraint `share >= 0 AND share <= 1` gilt für beide Typen.

#### Scenario: Exchange-Split-Constraint gewahrt — Summe ungleich 1.0

- **WHEN** der Planer `PUT /{meal_plan_id}/meal-items/{id}/splits/` mit Exchange-Splits aufruft, deren Summe ≠ 1.0 ist
- **THEN** gibt das Backend HTTP 400 zurück mit Fehlermeldung "Die Summe der Anteile muss 100% ergeben."

#### Scenario: Exchange-Split-Constraint erfüllt — Summe gleich 1.0

- **WHEN** der Planer Exchange-Splits mit Σ share = 1.0 speichert
- **THEN** werden die Splits mit HTTP 200 bestätigt

#### Scenario: Optionale-Zutat-Split mit beliebigem Anteil akzeptiert

- **WHEN** der Planer einen Split für eine optionale Zutat mit share = 0.6 speichert (ein Split-Eintrag)
- **THEN** wird der Split mit HTTP 200 bestätigt; share = 0.6 bedeutet 60% der Portionen enthalten die Zutat

#### Scenario: Optionale-Zutat-Split mit share=0 (weglassen) akzeptiert

- **WHEN** der Planer einen Split für eine optionale Zutat mit share = 0.0 speichert
- **THEN** wird der Split mit HTTP 200 bestätigt; die Zutat wird für 0% der Portionen eingeplant

#### Scenario: Optionale-Zutat-Split außerhalb des Bereichs abgelehnt

- **WHEN** der Planer einen Split mit share < 0.0 oder share > 1.0 sendet
- **THEN** lehnt der DB-CheckConstraint den Wert ab; das Backend gibt HTTP 400 zurück

#### Scenario: Kein Split-Eintrag → 100% Default

- **WHEN** für eine Exchange-Gruppe oder optionale Zutat keine `MealItemSplit`-Einträge existieren
- **THEN** wird das Original-Glied (exchange_position=0) bzw. die optionale Zutat für 100% der Portionen verwendet

## ADDED Requirements

### Requirement: Inklusions-Fraktion für optionale Zutaten korrekt gerundet

`get_included_fractions` SHALL für optionale Zutaten den gespeicherten `share`-Wert direkt als Inklusions-Fraktion verwenden, ohne `largest_remainder_round`-Verarbeitung. Die Aufrundung auf 100% (wie sie `largest_remainder_round` für Einzel-Werte produziert) MUST NICHT angewendet werden.

#### Scenario: Optionale Zutat 60% → fraktion 0.6

- **WHEN** `get_included_fractions` für ein MealItem mit optionalem Split share=0.6 und effective_portions=25 aufgerufen wird
- **THEN** ist `fractions[ri.id] = 0.6` (nicht 1.0)

#### Scenario: Optionale Zutat 0% → fraktion 0.0

- **WHEN** `get_included_fractions` für ein MealItem mit optionalem Split share=0.0 aufgerufen wird
- **THEN** ist `fractions[ri.id] = 0.0`

#### Scenario: Exchange-Gruppe weiterhin via largest_remainder_round

- **WHEN** `get_included_fractions` für ein MealItem mit Exchange-Split (0.8 / 0.2) und effective_portions=25 aufgerufen wird
- **THEN** werden beide Shares via `largest_remainder_round` gerundet und ergeben zusammen 25 Portionen

### Requirement: Kontext-abhängige Fehlermeldungen bei Split-Validierung

`_validate_split_shares` SHALL für Exchange-Gruppen und optionale Zutaten unterschiedliche Fehlermeldungen zurückgeben, die den jeweiligen Validierungs-Kontext korrekt beschreiben.

#### Scenario: Exchange-Summe ungleich 1.0

- **WHEN** die Summe der Shares einer Exchange-Gruppe ≠ 1.0 ist
- **THEN** Fehlermeldung: "Die Summe der Anteile muss 100% ergeben."

#### Scenario: Optionales Share außerhalb 0.0–1.0

- **WHEN** ein share für eine optionale Zutat < 0.0 oder > 1.0 ist
- **THEN** Fehlermeldung: "Der Anteil muss zwischen 0% und 100% liegen."
