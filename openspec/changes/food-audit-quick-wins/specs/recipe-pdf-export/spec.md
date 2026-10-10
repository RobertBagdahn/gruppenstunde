## MODIFIED Requirements

### Requirement: Nährwerte pro gespeicherter Normportion
Das Rezept-PDF MUST Nährwerte pro Portion anhand der gespeicherten Rezeptportionen berechnen. Eine temporäre Ziel-Portionszahl MUST nur die dargestellten Zutaten und Schritte skalieren und MUST die Nährwerte pro Portion nicht verändern.

#### Scenario: Geänderte Ziel-Portionszahl
- **GIVEN** gespeicherte Zutaten- und Nährwert-Caches gehören zur Normportion des Rezepts
- **WHEN** das PDF mit einer anderen Ziel-Portionszahl exportiert wird
- **THEN** bleiben die Nährwerte pro Portion unverändert und fachlich korrekt.
