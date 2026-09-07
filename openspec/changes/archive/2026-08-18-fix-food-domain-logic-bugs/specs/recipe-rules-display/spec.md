## MODIFIED Requirements

### Requirement: Werte werden pro Portion bereitgestellt

Der Endpunkt MUST für jede Regel `value_per_serving` als den Wert **einer Portion** des Rezepts liefern.
Wenn ein Rezept für $N$ Portionen angelegt ist (`recipe.portions = N`), MUST die Umrechnung von Nährwerten
`(Wert pro 100g × Gesamtgewicht_g / 100) / max(recipe.portions, 1)` verwenden.
Die Parameter `weight_g` (Gesamtgewicht pro Portion) und `price_total` (Preis pro Portion) MUST ebenfalls durch `max(recipe.portions, 1)` dividiert werden.
Der Parameter `nutri_class` (Qualitätsklasse) MUSS unskaliert bleiben.
Die Statusauswertung MUSS unverändert über `Rule.evaluate()` erfolgen.

#### Scenario: Umrechnung auf Portion bei 1-Portionen-Rezept
- **WHEN** ein Rezept für 1 Portion ein Gesamtgewicht von 350g hat und sein Eiweißwert 8.0g pro 100g beträgt
- **THEN** entspricht `value_per_serving` für `protein_g` dem Portionswert `8.0 × 350 / 100 = 28.0g`

#### Scenario: Umrechnung auf Portion bei Multi-Portionen-Rezept
- **WHEN** ein Rezept für 4 Portionen ein Gesamtgewicht von 1200g hat und sein Energiewert 150 kcal pro 100g beträgt
- **THEN** entspricht `value_per_serving` für `energy_kcal` dem Wert pro Portion `(150 × 1200 / 100) / 4 = 450.0 kcal`
- **AND** dieser Wert (450 kcal) wird gegen die Einzelportions-Regelgrenzen ausgewertet

#### Scenario: Gewicht und Preis pro Portion bei Multi-Portionen-Rezept
- **WHEN** ein Rezept für 4 Portionen ein Gesamtgewicht von 1200g und einen Gesamtpreis von 8,00 EUR hat
- **THEN** beträgt `value_per_serving` für `weight_g` 300g
- **AND** `value_per_serving` für `price_total` beträgt 2,00 EUR

### Requirement: Portion-based evaluation of recipe rules
The system SHALL evaluate all recipe-scope rules and cockpit meal aggregations on the basis of a single serving.
Nutrient and ingredient contributions from recipes SHALL be normalized by dividing by `max(recipe.portions, 1)`.

#### Scenario: Recipe rule evaluation scales nutrient values per serving
- **WHEN** a recipe configured for 4 servings has a total weight of 1000g and 15.0g protein per 100g (150.0g total)
- **AND** a rule "protein_g >= 30" (scope="recipe") is active
- **THEN** the rule evaluation evaluates the single serving value ($150.0 / 4 = 37.5\text{g}$) against the threshold and returns status "green"
