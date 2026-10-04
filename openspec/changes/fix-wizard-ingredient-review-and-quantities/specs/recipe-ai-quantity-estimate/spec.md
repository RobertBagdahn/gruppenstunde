## ADDED Requirements

### Requirement: Passende eigene Portion wird eins zu eins übernommen
Entspricht die importierte Einheit dem Namen oder der Messeinheit einer aktiven Portion der Zutat mit vertrauenswürdigem Gewicht, SHALL die vorgeschlagene Portionszahl der importierten Menge entsprechen (geteilt durch die Portionsmenge), ohne Umweg über Gramm. Eine leere Einheit oder „Stück“ mit Stückportion MUST die Menge unverändert als Portionszahl liefern.

#### Scenario: 2 EL Olivenöl
- **WHEN** „2 EL Olivenöl“ importiert wird und `Olivenöl` eine Portion „Esslöffel“ hat
- **THEN** beträgt die vorgeschlagene Portionszahl 2
- **AND** nicht 1,84

#### Scenario: 1 Zwiebel
- **WHEN** „1 Zwiebel“ importiert wird und `Zwiebel` eine Portion „mittelgroße Zwiebel“ hat
- **THEN** beträgt die vorgeschlagene Portionszahl 1
- **AND** nicht 1,25

#### Scenario: Einheit ohne passende Portion
- **WHEN** die Einheit zu keiner Portion der Zutat passt (z. B. `g`, `Dose`)
- **THEN** bleibt die bisherige Umrechnung über Gramm erhalten

#### Scenario: Portion ohne vertrauenswürdiges Gewicht
- **WHEN** die passende Portion kein vertrauenswürdiges Gewicht hat
- **THEN** wird der Direktabgleich übersprungen und der bisherige Weg genutzt
