## MODIFIED Requirements

### Requirement: Overrides in every output path

`MealItemOverride.excluded` und `quantity_override` SHALL in allen Berechnungspfaden gelten:
Nährwerte, Kosten, Einkaufsliste, Kochplan, Varianten und Cockpit. Die fachliche Definition
steht in `meal-item-overrides`; diese Änderung stellt nur die vollständige Nutzung in den
betroffenen Pfaden sicher.

#### Scenario: Ausschluss gilt überall
- **WHEN** ein Override `excluded=true` enthält
- **THEN** fehlt das RecipeItem in Kosten, Nährwerten, Einkaufsliste, Kochplan, Varianten und Cockpit
