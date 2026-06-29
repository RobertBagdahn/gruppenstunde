## ADDED Requirements

### Requirement: Kombiniertes Anzeigeformat für Zutaten
Das Backend SHALL für jeden `RecipeItem`- und `MealItem`-API-Response ein `portion_display`-Feld als fertig formatierten String liefern. Das Format ist `"{quantity} {unit_name} {ingredient_name} ({weight})"`. Der String wird im Backend berechnet; das Frontend zeigt ihn unverändert an.

#### Scenario: Normaler Portionsname mit Stückzahl
- **WHEN** ein `RecipeItem` hat `quantity=3.4`, `portion.measuring_unit.name="Stück"`, `ingredient.name="Äpfel"`, `portion.weight_g=285`
- **THEN** liefert die API `portion_display = "3,4 Äpfel (969g)"` (Einheit „Stück" wird unterdrückt, da überflüssig)

#### Scenario: Portionsname mit echter Einheit
- **WHEN** ein `RecipeItem` hat `quantity=0.5`, `portion.measuring_unit.name="EL"`, `ingredient.name="Olivenöl"`, `portion.weight_g=15`
- **THEN** liefert die API `portion_display = "0,5 EL Olivenöl (8g)"`

#### Scenario: Milligramm-Anzeige bei sehr kleinen Mengen
- **WHEN** ein `RecipeItem` hat `portion.weight_g=0.3` und `quantity=1`, `portion.measuring_unit.name="Prise"`, `ingredient.name="Salz"`
- **THEN** liefert die API `portion_display = "1 Prise Salz (300mg)"`

#### Scenario: Kilogramm-Anzeige bei großen Mengen
- **WHEN** das berechnete Gesamtgewicht einer Zutat ist >= 1000g (z.B. 1500g)
- **THEN** liefert die API `portion_display = "... (1,5 kg)"` mit genau einer Dezimalstelle

#### Scenario: Ganzzahlige Menge ohne Dezimalstelle
- **WHEN** `quantity=2` (ganzzahlig)
- **THEN** liefert die API `portion_display = "2 EL Honig (30g)"` — kein trailing zero wie „2,0"

#### Scenario: Fehlende weight_g
- **WHEN** `portion.weight_g` ist `null`
- **THEN** liefert die API `portion_display = "1 Prise Salz"` (ohne Gramm-Klammer) und `has_missing_weight = true`

#### Scenario: Fehlender Ingredient-Name
- **WHEN** `ingredient.name` ist leer oder null
- **THEN** MUST der Slug als Fallback verwendet werden: `"3,4 apfel (969g)"`

### Requirement: Gewichtsformatierung mit mg/g/kg-Stufen
Das Backend SHALL eine zentrale `format_weight(grams: float) -> str` Funktion in `backend/supply/utils.py` bereitstellen, die für alle Formatierungen genutzt wird.

#### Scenario: Unter 1g → Milligramm
- **WHEN** `grams < 1`
- **THEN** MUST die Ausgabe in mg sein: `0.3 → "300mg"`, `0.05 → "50mg"`

#### Scenario: 1g bis 9g → auf 1g gerundet
- **WHEN** `1 <= grams < 10`
- **THEN** MUST auf die nächste ganze Zahl gerundet werden: `3.7 → "4g"`

#### Scenario: 10g bis 99g → auf 5g gerundet
- **WHEN** `10 <= grams < 100`
- **THEN** MUST auf die nächsten 5g gerundet werden: `47 → "45g"`, `53 → "55g"`

#### Scenario: 100g bis 999g → auf 10g gerundet
- **WHEN** `100 <= grams < 1000`
- **THEN** MUST auf die nächsten 10g gerundet werden: `145 → "150g"`, `964 → "960g"`

#### Scenario: Ab 1000g → Kilogramm mit einer Dezimalstelle
- **WHEN** `grams >= 1000`
- **THEN** MUST in kg mit genau einer Dezimalstelle und Komma als Dezimalzeichen ausgegeben werden: `1500 → "1,5 kg"`, `1000 → "1,0 kg"`

### Requirement: Stück-Unterdrückung im Portionsnamen
Wenn der `MeasuringUnit.name` exakt `"Stück"` ist, SHALL der Einheitenname im `portion_display`-String weggelassen werden, da der Ingredient-Name allein ausreichend ist.

#### Scenario: Stück wird unterdrückt
- **WHEN** `measuring_unit.name == "Stück"`
- **THEN** MUST `portion_display` das Format `"{quantity} {ingredient_name} ({weight})"` haben, ohne „Stück" dazwischen

#### Scenario: Andere Einheiten bleiben erhalten
- **WHEN** `measuring_unit.name` ist nicht „Stück" (z.B. „EL", „Prise", „Packung")
- **THEN** MUST der Einheitenname im `portion_display` erscheinen

### Requirement: MealItem-Anzeige pro NormPerson
Im Essensplan SHALL `portion_display` die Menge **pro NormPerson** widerspiegeln (Gesamtgewicht dividiert durch `meal_plan.norm_portions`). Ein separates Feld `is_per_norm_person: true` zeigt an, dass das Frontend einen Kontexthinweis rendern soll.

#### Scenario: Essensplan-Anzeige pro Person
- **WHEN** ein `MealItem` hat Gesamtgewicht 970g für 10 NormPersonen
- **THEN** liefert die API `portion_display = "0,34 Äpfel (97g)"` und `is_per_norm_person = true`

#### Scenario: Hinweis-Badge im Frontend
- **WHEN** `is_per_norm_person == true`
- **THEN** MUST das Frontend einen Hinweis rendern, z.B. „pro Person (Normportionen)"

### Requirement: Markierung für fehlende Gewichtsdaten
Zutaten ohne definiertes `weight_g` (Portion ohne Gewicht) SHALL im Frontend orange markiert werden, damit Daten-Lücken sichtbar sind.

#### Scenario: Fehlende Gewichtsdaten — orange Markierung
- **WHEN** `has_missing_weight == true` auf einem `RecipeItemOut` oder `MealItemOut`
- **THEN** MUST die Zutatzeile im Frontend visuell hervorgehoben werden (orange Akzentfarbe oder Warnicon)

#### Scenario: Vollständige Daten — keine Markierung
- **WHEN** `has_missing_weight == false` oder fehlt
- **THEN** MUST die Zeile normal (ohne Hervorhebung) angezeigt werden
