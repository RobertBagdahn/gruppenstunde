## ADDED Requirements

### Requirement: Filter redundant portions from natural display
Portionen mit `weight_g <= 1` werden nicht in der "ca. X x"-Anzeige berücksichtigt, da sie redundant zur Gramm-Angabe sind.

#### Scenario: Zutat hat nur eine Gramm-Fallback-Portion (weight_g=1)
- **WHEN** alle Portionen einer Zutat `weight_g <= 1` haben
- **THEN** wird keine "ca. X x"-Zeile angezeigt

#### Scenario: Zutat hat eine sinnvolle Portion (weight_g > 1)
- **WHEN** eine Portion mit `weight_g > 1` existiert (z.B. "Stück" = 300g)
- **THEN** wird diese normal als "ca. X x Stück" angezeigt

#### Scenario: Zutat hat gemischte Portionen
- **WHEN** eine Zutat sowohl eine `weight_g=1` als auch eine `weight_g=300` Portion hat
- **THEN** wird nur die Portion mit `weight_g > 1` angezeigt
