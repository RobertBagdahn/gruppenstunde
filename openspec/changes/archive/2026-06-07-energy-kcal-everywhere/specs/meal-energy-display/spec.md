## MODIFIED Requirements

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
liefern, skaliert auf die `norm_portions` des Essensplans:
`energy_kcal = cached_energy_total_kcal * factor * (norm_portions / servings)`.
Der Wert MUST die echte Rezeptmenge berücksichtigen und DARF NICHT auf dem
pro-100g-Wert `cached_energy_kcal` basieren.

#### Scenario: Item-Energie für ein realistisches Rezept
- **WHEN** ein Mahlzeit-Item ein Rezept mit bekannter Gesamtenergie referenziert
- **THEN** `energy_kcal` entspricht `cached_energy_total_kcal * factor * norm_portions / servings`
  und ergibt nach Division (`/ norm_portions`) eine realistische
  Pro-Portion-Kalorienzahl

#### Scenario: Rezept ohne gecachte Gesamtenergie
- **WHEN** das referenzierte Rezept `cached_energy_total_kcal = None` hat
- **THEN** `energy_kcal` ist `None`

### Requirement: Realistische Gesamtenergie im Meal Output

`MealOut.total_energy_kcal` SHALL die Summe der `energy_kcal`-Werte aller Items der
Mahlzeit liefern, berechnet auf Basis von `cached_energy_total_kcal`. Der Wert MUST
konsistent mit dem `nutrition_summary`-Endpunkt für dieselbe Datenbasis sein.

#### Scenario: Summierung über mehrere Items
- **WHEN** eine Mahlzeit mehrere Rezept-Items enthält
- **THEN** `total_energy_kcal` ist die Summe der Item-`energy_kcal`-Werte

#### Scenario: Konsistenz mit Nutrition-Summary
- **WHEN** dieselbe Mahlzeit über `MealOut.total_energy_kcal` und über den
  `nutrition_summary`-Endpunkt berechnet wird
- **THEN** beide Energiewerte stimmen (bis auf Rundung) überein

### Requirement: Korrekte Soll/Ist-Coverage im Cockpit

Die im Essensplan angezeigte Ist-Coverage (`getCoverageStatus`) SHALL auf den
korrigierten Energiewerten in kcal beruhen, sodass der Ist-Prozentwert die tatsächliche
Kalorienabdeckung einer Mahlzeit relativ zum Soll-Tagesanteil widerspiegelt.

#### Scenario: Realistische Ist-Prozente
- **WHEN** eine Mahlzeit mit ausreichend energiereichen Rezepten ihren
  Soll-Tagesanteil deckt
- **THEN** der angezeigte Ist-Prozentwert liegt in einer plausiblen Größenordnung
  (nicht um Faktor 10–20 zu niedrig)
