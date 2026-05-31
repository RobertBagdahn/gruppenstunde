## MODIFIED Requirements

### Requirement: Feinere Rundung für kleine Mengen

Die `smartRound()`-Funktion muss Mengen unter 10g feiner runden, damit kleine Zutatenmengen korrekt angezeigt werden. Die Grenzen sind konsistent mit `quantity-display-formatting`.

#### Scenario: Menge unter 2
- **WHEN** der Eingabewert zwischen 0 (exklusiv) und 2 liegt
- **THEN** wird auf 0,1 gerundet (z.B. 0,25 → 0,3; 1,5 → 1,5)

#### Scenario: Menge zwischen 2 und 10
- **WHEN** der Eingabewert zwischen 2 und 10 liegt
- **THEN** wird auf 1 gerundet (z.B. 3,75 → 4)

#### Scenario: Menge ist 0
- **WHEN** der Eingabewert 0 oder negativ ist
- **THEN** wird 0 zurückgegeben
