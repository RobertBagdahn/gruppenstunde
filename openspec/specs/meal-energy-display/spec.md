# meal-energy-display Specification

## Purpose
Provide realistic, consistent energy (kcal) values for recipes, meal items, and meals, and a correct Soll/Ist coverage display that honors each meal's effective portions.

## Requirements
### Requirement: Recipe gesamt-energie Cache

`Recipe` SHALL ein denormalisiertes Feld `cached_energy_total_kcal` (Float, nullable)
führen, das die Gesamtenergie des Rezepts in kcal über alle `servings` enthält.
Der Wert MUST aus den aggregierten pro-100g-Nährwerten und dem Gesamtgewicht des
Rezepts (`Σ RecipeItem.quantity * portion.weight_g`) berechnet werden:
`cached_energy_total_kcal = energy_kcal_per_100g * (total_weight_g / 100)`.
Der Wert MUST gemeinsam mit den übrigen Cache-Feldern in
`recalculate_recipe_cache` befüllt und über dieselben Signale invalidiert werden.

#### Scenario: Cache-Berechnung mit gewichteten Zutaten
- **WHEN** `recalculate_recipe_cache` für ein Rezept mit Zutaten und gesetzten
  `portion.weight_g` und Zutaten-Energiewerten läuft
- **THEN** `cached_energy_total_kcal` entspricht der Summe der Zutaten-Energien
  (Zutatenenergie pro 100g × tatsächliches Gewicht / 100)

#### Scenario: Rezept ohne preis- oder gewichtsfähige Zutaten
- **WHEN** ein Rezept keine Zutaten mit `weight_g` oder Energiewerten hat
- **THEN** `cached_energy_total_kcal` ist `None` oder `0`, ohne Fehler

#### Scenario: Cache wird bei Zutatenänderung invalidiert
- **WHEN** ein `RecipeItem` des Rezepts hinzugefügt, geändert oder gelöscht wird
- **THEN** `cached_energy_total_kcal` wird durch das bestehende Signal neu berechnet

### Requirement: Realistische Energie im Meal-Item Output

`MealItemOut.energy_kcal` SHALL die tatsächliche Gesamtenergie des Rezept-Items in kcal
liefern, skaliert auf die `effective_portions` der Mahlzeit
(`override_portions or norm_portions`):
`energy_kcal = cached_energy_total_kcal * factor * (effective_portions / portions)`.
Der Wert MUST die echte Rezeptmenge berücksichtigen und DARF NICHT auf dem
pro-100g-Wert `cached_energy_kcal` basieren und DARF NICHT hartcodiert `norm_portions`
verwenden, wenn die Mahlzeit `override_portions` gesetzt hat.

#### Scenario: Item-Energie für ein realistisches Rezept
- **WHEN** ein Mahlzeit-Item ein Rezept mit bekannter Gesamtenergie referenziert
- **THEN** `energy_kcal` entspricht `cached_energy_total_kcal * factor * effective_portions / portions`
  und ergibt nach Division (`/ effective_portions`) eine realistische
  Pro-Portion-Kalorienzahl

#### Scenario: Rezept ohne gecachte Gesamtenergie
- **WHEN** das referenzierte Rezept `cached_energy_total_kcal = None` hat
- **THEN** `energy_kcal` ist `None`

### Requirement: Realistische Gesamtenergie im Meal Output

`MealOut.total_energy_kcal` SHALL für alle Mahlzeiten denselben Bezug haben: einen
GESAMTwert über alle `effective_portions` der Mahlzeit. Für nicht-externe Mahlzeiten ist
das die Summe der Item-`energy_kcal`-Werte. Für externe Mahlzeiten MUST der manuell
eingegebene Pro-Person-Wert mit `effective_portions` multipliziert werden
(`external_energy_kcal × effective_portions`); fehlt der manuelle Wert, MUST der Fallback
`NORM_PERSON_DAILY_KCAL × day_part_factor × effective_portions` verwendet werden. Der Wert
MUST konsistent mit dem `nutrition_summary`-Endpunkt für dieselbe Datenbasis sein.

#### Scenario: Summierung über mehrere Items
- **WHEN** eine Mahlzeit mehrere Rezept-Items enthält
- **THEN** `total_energy_kcal` ist die Summe der Item-`energy_kcal`-Werte

#### Scenario: Externe Mahlzeit liefert Gesamtwert
- **WHEN** ein Plan `norm_portions = 10` hat und eine externe Mahlzeit
  `external_energy_kcal = 500` (pro Person) ohne override
- **THEN** `total_energy_kcal` SHALL `500 × 10 = 5000` betragen (nicht 500)

#### Scenario: Konsistenz mit Nutrition-Summary
- **WHEN** dieselbe Mahlzeit über `MealOut.total_energy_kcal` und über den
  `nutrition_summary`-Endpunkt berechnet wird
- **THEN** beide Energiewerte stimmen (bis auf Rundung) überein

### Requirement: Korrekte Soll/Ist-Coverage im Cockpit

Die Soll/Ist-Coverage einer Mahlzeit SHALL aus dem Pro-Person-Ist-Wert
(`total_energy_kcal / effective_portions`) gegen das Mahlzeit-Soll
(`NORM_PERSON_DAILY_KCAL × day_part_factor`) berechnet werden. In der Übersicht (`MealSlot`)
MUST der Tagesanteil ("Soll X%", neutral) getrennt vom Erfüllungsgrad ("Ist X% erfüllt",
gefärbt nach Coverage-Status) dargestellt werden. Ein separat berechneter, von der
Coverage abweichender Tagesanteil-Ist-Wert (`actualDailyPercent`) DARF NICHT verwendet werden.

#### Scenario: Soll und Ist getrennt dargestellt
- **WHEN** eine Mahlzeit Tagesanteil 25% hat und ihr Mahlzeit-Soll zu 96% erfüllt
- **THEN** die Übersicht SHALL "Soll 25%" (neutral) und "Ist 96% erfüllt" (gefärbt) zeigen,
  ohne beide Prozentwerte zu vermischen

#### Scenario: Färbung folgt dem Erfüllungsgrad
- **WHEN** der Erfüllungsgrad einer Mahlzeit im kritischen Bereich liegt
- **THEN** die "Ist erfüllt"-Anzeige SHALL in der Warn-/Kritisch-Farbe dargestellt werden
