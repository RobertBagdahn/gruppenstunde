## ADDED Requirements

### Requirement: Fallback-Anzeige bei fehlender Grammzahl

Zutaten ohne gültige `weight_g` auf der Portion (0 oder null) werden mit Menge und Portionsname dargestellt statt "0 g".

#### Scenario: Zutat mit weight_g=0
- **WHEN** ein RecipeItem eine Portion mit `weight_g=0` hat
- **THEN** wird die Zutat als `{quantity} x {portion.name}` angezeigt (z.B. "2 EL", "1 Prise")

#### Scenario: Zutat mit gültigem weight_g
- **WHEN** ein RecipeItem eine Portion mit `weight_g > 0` hat
- **THEN** wird die Zutat weiterhin in Gramm angezeigt (z.B. "200 g")

### Requirement: Immer lesbarer Zutatname

Es darf niemals "Unbekannt" in der Einkaufsliste oder Zutatenliste angezeigt werden.

#### Scenario: Ingredient nicht verlinkt
- **WHEN** ein RecipeItem weder `ingredient` noch `portion.ingredient` hat
- **THEN** wird als Fallback `portion.name`, dann `note`, dann "Zutat" angezeigt

### Requirement: Aufrundung bei natürlichen Portionen

Bruchzahlen bei natürlichen Portionen (Stück, Zehe, Scheibe etc.) werden auf 1 aufgerundet.

#### Scenario: Skalierung ergibt Bruchzahl bei natürlicher Portion
- **WHEN** die berechnete Menge einer natürlichen Portion < 1 ist (z.B. 0,3 x Knoblauchzehe)
- **THEN** wird auf 1 aufgerundet
