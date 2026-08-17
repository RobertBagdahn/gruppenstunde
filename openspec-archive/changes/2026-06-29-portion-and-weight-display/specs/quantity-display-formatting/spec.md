## MODIFIED Requirements

### Requirement: Gewichtsformatierung mit automatischer Einheitenwahl
Die zentrale Gewichtsformatierungsfunktion MUST die Stufen mg/g/kg unterstützen und deutsche Zahlenformatierung (Komma als Dezimalzeichen) verwenden. Die Funktion existiert sowohl im Backend (`backend/supply/utils.py`) als auch im Frontend (`frontend-food/src/utils/formatWeight.ts`) und MUST konsistentes Verhalten zeigen.

#### Scenario: Milligramm-Stufe (neu)
- **WHEN** der Wert in Gramm ist `< 1`
- **THEN** MUST in Milligramm ausgegeben werden: `0.3g → "300mg"`, `0.05g → "50mg"`

#### Scenario: Gramm-Stufe — kleine Mengen (1–9g)
- **WHEN** `1 <= grams < 10`
- **THEN** MUST auf die nächste ganze Zahl gerundet und mit „g" ausgegeben werden: `3.7g → "4g"`

#### Scenario: Gramm-Stufe — mittlere Mengen (10–99g)
- **WHEN** `10 <= grams < 100`
- **THEN** MUST auf 5g gerundet ausgegeben werden: `47g → "45g"`

#### Scenario: Gramm-Stufe — große Mengen (100–999g)
- **WHEN** `100 <= grams < 1000`
- **THEN** MUST auf 10g gerundet ausgegeben werden: `145g → "150g"`

#### Scenario: Kilogramm-Stufe
- **WHEN** `grams >= 1000`
- **THEN** MUST in kg mit genau einer Dezimalstelle ausgegeben werden, Dezimalzeichen ist Komma: `1500g → "1,5 kg"`, `1000g → "1,0 kg"`

### Requirement: Deutsche Zahlenformatierung für Portionsmengen
Portionsmengen (der `quantity`-Wert vor dem Einheitennamen) MUST mit deutschem Dezimalzeichen (Komma) angezeigt werden, wenn eine Dezimalstelle nötig ist.

#### Scenario: Dezimalzahl mit Komma
- **WHEN** `quantity = 3.4`
- **THEN** MUST die Anzeige `"3,4"` sein (nicht `"3.4"`)

#### Scenario: Ganzzahl ohne trailing zero
- **WHEN** `quantity = 2.0`
- **THEN** MUST die Anzeige `"2"` sein (nicht `"2,0"`)
