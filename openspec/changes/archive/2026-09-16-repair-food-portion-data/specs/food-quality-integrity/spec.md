## MODIFIED Requirements

### Requirement: Variantenauswahl ist in allen Food-Berechnungen konsistent
Nach einer Portionsdaten-Reparatur MUST das System dieselbe aktive RecipeItem-Auswahl und die korrigierten Portionen in Nährwertaggregation, Preisen, Einkaufslisten und Kochplan verwenden.

#### Scenario: Repaired portion across consumers
- **WHEN** ein RecipeItem auf eine korrigierte Replacement-Portion umgestellt wurde
- **THEN** müssen Nährwerte, Kosten, Einkaufsliste und Kochplan dieselbe neue Portion verwenden
- **THEN** darf die alte Portion nicht zusätzlich aggregiert werden

### Requirement: Recipe-Forking und Variantenschutz sind atomar
Repair-Rebinds dürfen keine aktiven MealPlan-Variantendaten beschädigen und müssen innerhalb einer atomaren Transaktion erfolgen.

#### Scenario: Repair with active meal plan
- **WHEN** ein zu reparierendes RecipeItem von einem aktiven MealPlan referenziert wird
- **THEN** darf die Reparatur nur vollständig oder gar nicht angewendet werden
- **THEN** bleiben aktive Varianten und ihre Auswahlsemantik gültig
