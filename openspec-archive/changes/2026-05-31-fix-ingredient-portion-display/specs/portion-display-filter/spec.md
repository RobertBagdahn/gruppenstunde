## ADDED Requirements

### Requirement: Filter base portions from highPrioPortion display
Die "≈ X Portionsname"-Subzeile in der Zutatenliste darf keine Portionen mit `weight_g <= 1` anzeigen, da diese nur die Basiseinheit (Gramm/ml) repräsentieren und redundant zur Hauptzeile wären.

#### Scenario: Zutat hat nur Basis-Portion (weight_g=1, is_default=false)
- **WHEN** die einzige non-default Portion `weight_g <= 1` hat
- **THEN** wird keine "≈"-Subzeile angezeigt (nur Preis, falls vorhanden)

#### Scenario: Zutat hat sinnvolle non-default Portion (weight_g > 1)
- **WHEN** eine non-default Portion mit `weight_g > 1` existiert (z.B. "Stück" = 180g)
- **THEN** wird diese als "≈ 2,5 Stück" in der Subzeile angezeigt

#### Scenario: Konsistenz mit calculateNaturalPortions
- **WHEN** die expanded "weitere Portionen"-Ansicht eine Portion ausfiltert
- **THEN** filtert die highPrioPortion-Logik dieselbe Portion ebenfalls aus
