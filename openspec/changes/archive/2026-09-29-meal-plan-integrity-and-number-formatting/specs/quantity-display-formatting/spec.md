## REMOVED Requirements

### Requirement: Gewichtsformatierung mit automatischer Einheitenwahl
**Reason**: Die Stufengrenzen ändern sich (1–49 g ganzzahlig, 50–99 g auf 5 g, 100–999 g auf 10 g), gerundet wird kaufmännisch statt mit Bankers-Rounding, und Front- und Backend müssen identisch formatieren.

**Migration**: Ersetzt durch „Gewichtsformatierung mit Einheitenwahl und kaufmännischem Runden“ (`formatWeight` in `frontend-food/src/lib/format.ts`, `format_weight` in `backend/supply/utils.py`, gemeinsame Testtabelle).

## MODIFIED Requirements

### Requirement: Deutsche Zahlenformatierung für Portionsmengen
Portionsmengen (der `quantity`-Wert vor dem Einheitennamen) MUST mit deutschem Dezimalzeichen (Komma) angezeigt werden, wenn eine Dezimalstelle nötig ist.

#### Scenario: Dezimalzahl mit Komma
- **WHEN** `quantity = 3.4`
- **THEN** MUST die Anzeige `"3,4"` sein (nicht `"3.4"`)

#### Scenario: Ganzzahl ohne trailing zero
- **WHEN** `quantity = 2.0`
- **THEN** MUST die Anzeige `"2"` sein (nicht `"2,0"`)

### Requirement: Konvention „Gramm zuerst, Portion sekundär"
Überall dort, wo eine Gramm-Menge zusammen mit einem abgeleiteten Portionshinweis angezeigt wird, SHALL die Reihenfolge „Gramm zuerst, Portion sekundär" gelten: `"{grams} g · ≈ {count} {portion_name}"`. Diese Konvention gilt für alle Anzeigeorte (Buffet- bzw. Frühstücksbaukasten, Essensplan-Editor, Einkaufsliste, `IngredientDetailPage`).

#### Scenario: Vereinheitlichung auf IngredientDetailPage
- **WHEN** `IngredientDetailPage` eine Portion mit `weight_g=285` für eine Zutat mit `name="Stück"` anzeigt
- **THEN** MUST die Anzeige `"285 g · ≈ 1 Stück"` lauten

#### Scenario: Konsistenz zwischen Essensplan-Editor und Wizard
- **WHEN** dieselbe Zutat sowohl im Baukasten als auch im Essensplan-Editor mit Gramm-Menge angezeigt wird
- **THEN** MUST in beiden Kontexten dieselbe Reihenfolge und dasselbe Rundungsverhalten gelten

## ADDED Requirements

### Requirement: Gewichtsformatierung mit Einheitenwahl und kaufmännischem Runden
Die zentrale Gewichtsformatierungsfunktion MUST die Stufen mg/g/kg unterstützen und deutsche Zahlenformatierung (Komma als Dezimalzeichen) verwenden. Zwischen Zahl und Einheit MUST ein Leerzeichen stehen. Die Funktion existiert im Frontend (`frontend-food/src/lib/format.ts`, `formatWeight`) und für die PDF-Ausgabe im Backend (`backend/supply/utils.py`, `format_weight`) und MUST in beiden identische Ergebnisse liefern. Gerundet wird kaufmännisch (0,5 rundet auf), nicht mit Bankers-Rounding.

#### Scenario: Milligramm-Stufe
- **WHEN** der Wert in Gramm ist `< 1`
- **THEN** MUST in Milligramm ausgegeben werden: `0.3 → "300 mg"`, `0.05 → "50 mg"`

#### Scenario: Gramm-Stufe — kleine Mengen (1–49 g)
- **WHEN** `1 <= grams < 50`
- **THEN** MUST auf die nächste ganze Zahl gerundet werden: `3.7 → "4 g"`, `2.5 → "3 g"`, `47 → "47 g"`

#### Scenario: Gramm-Stufe — mittlere Mengen (50–99 g)
- **WHEN** `50 <= grams < 100`
- **THEN** MUST auf 5 g gerundet werden: `57 → "55 g"`, `97.5 → "100 g"`

#### Scenario: Gramm-Stufe — große Mengen (100–999 g)
- **WHEN** `100 <= grams < 1000`
- **THEN** MUST auf 10 g gerundet werden: `145 → "150 g"`

#### Scenario: Kilogramm-Stufe
- **WHEN** `grams >= 1000`
- **THEN** MUST in kg mit genau einer Dezimalstelle ausgegeben werden: `1500 → "1,5 kg"`, `1000 → "1,0 kg"`

#### Scenario: Gleiches Ergebnis in Front- und Backend
- **WHEN** Frontend und Backend denselben Wert formatieren (Testtabelle mit Grenzwerten 0.5, 2.5, 49.5, 97.5, 999.5)
- **THEN** MUST die Ausgabe identisch sein


### Requirement: Definierte Portionsgewichte werden nicht gerundet
Das definierte Gewicht einer Portion („à … g“, Portionslisten, Portionsauswahl) MUST exakt angezeigt werden (`formatExactWeight`, höchstens eine Nachkommastelle, Komma). Gerundet werden nur berechnete Mengen (Anzahl × Portionsgewicht, Summen).

#### Scenario: Portion Nudeln
- **WHEN** eine Rezeptzeile „1,9 × Portion Nudeln“ mit Portionsgewicht 125 g angezeigt wird
- **THEN** zeigt die Portionsangabe „à 125 g“ und die berechnete Menge „240 g“
