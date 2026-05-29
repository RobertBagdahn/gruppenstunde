## ADDED Requirements

### Requirement: Feinere Rundung für kleine Mengen

Die `smartRound()`-Funktion muss Mengen unter 10g feiner runden, damit kleine Zutatenmengen korrekt angezeigt werden.

#### Scenario: Menge unter 1g
- **WHEN** der Eingabewert zwischen 0 (exklusiv) und 1g liegt
- **THEN** wird auf 0,1g gerundet (z.B. 0,25 → 0,3)

#### Scenario: Menge zwischen 1g und 10g
- **WHEN** der Eingabewert zwischen 1g und 10g liegt
- **THEN** wird auf 1g gerundet (z.B. 3,75 → 4)

#### Scenario: Menge ist 0
- **WHEN** der Eingabewert 0 oder negativ ist
- **THEN** wird 0 zurückgegeben

### Requirement: Keine Rundung auf Null

Positive Eingabewerte dürfen nie auf 0 gerundet werden.

#### Scenario: Sehr kleine Menge
- **WHEN** der Eingabewert > 0 aber < 0,05 ist
- **THEN** wird mindestens 0,1 zurückgegeben

### Requirement: Dezimalanzeige für kleine Werte

`formatNumber()` muss für Werte < 1 eine Nachkommastelle anzeigen.

#### Scenario: Wert mit Dezimalstelle
- **WHEN** der anzuzeigende Wert 0,3 ist
- **THEN** wird "0,3" angezeigt (deutsches Zahlenformat)
