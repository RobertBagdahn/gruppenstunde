# quantity-display-formatting Specification

## Purpose

Definiert ein konsistentes Format für die Anzeige von Gewichtsmengen in Gramm, Milligramm und Kilogramm mit deutscher Zahlenformatierung (Komma als Dezimalzeichen) sowie für Portionsmengen in Bruchteilen.
## Requirements
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

### Requirement: Internal calculations remain exact
The system SHALL store and compute with exact (unrounded) values. Rounding is applied only at the display layer and MUST NOT affect stored data, API responses, or intermediate calculations.

#### Scenario: Scaling preserves precision
- **WHEN** a recipe with 15g pepper for 8 servings is scaled to 1 serving
- **THEN** the internal value is 1.875 and the display shows "1,9 g"

### Requirement: Deutsche Zahlenformatierung für Portionsmengen
Portionsmengen (der `quantity`-Wert vor dem Einheitennamen) MUST mit deutschem Dezimalzeichen (Komma) angezeigt werden, wenn eine Dezimalstelle nötig ist.

#### Scenario: Dezimalzahl mit Komma
- **WHEN** `quantity = 3.4`
- **THEN** MUST die Anzeige `"3,4"` sein (nicht `"3.4"`)

#### Scenario: Ganzzahl ohne trailing zero
- **WHEN** `quantity = 2.0`
- **THEN** MUST die Anzeige `"2"` sein (nicht `"2,0"`)

### Requirement: Konvention „Gramm zuerst, Portion sekundär"

Überall dort, wo eine Gramm-Menge zusammen mit einem abgeleiteten Portionshinweis angezeigt wird, SHALL die Reihenfolge „Gramm zuerst, Portion sekundär" gelten: `"{grams}g · ≈ {count} {portion_name}"`. Diese Konvention gilt sowohl für neue Anzeigeorte (Breakfast Wizard, Essensplan-Editor) als auch für bestehende Anzeigeorte, die zuvor „Portion zuerst" darstellten (z.B. `IngredientDetailPage`).

#### Scenario: Vereinheitlichung auf IngredientDetailPage

- **WHEN** `IngredientDetailPage` eine Portion mit `weight_g=285` für eine Zutat mit `name="Stück"` anzeigt
- **THEN** MUST die Anzeige `"285g · ≈ 1 Stück"` lauten (nicht mehr `"Stück (≈ 285g)"`)

#### Scenario: Konsistenz zwischen Essensplan-Editor und Wizard

- **WHEN** dieselbe Zutat sowohl im Breakfast Wizard als auch im Essensplan-Editor mit Gramm-Menge angezeigt wird
- **THEN** MUST in beiden Kontexten dieselbe „Gramm zuerst, Portion sekundär"-Reihenfolge und dasselbe Rundungsverhalten gelten

