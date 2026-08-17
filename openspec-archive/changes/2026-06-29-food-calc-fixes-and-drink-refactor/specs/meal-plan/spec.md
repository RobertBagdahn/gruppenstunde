# meal-plan Specification (Delta)

## MODIFIED Requirements

### Requirement: cost_summary Direktzutat-Gewicht über kanonischen Helper

Das System SHALL für Direktzutaten (`MealItem.ingredient`) im `cost_summary`-Endpunkt `_resolve_ingredient_weight_g` aus `planner/services/meal_item_helpers.py` verwenden — konsistent mit `nutrition_summary`.

#### Scenario: Direktzutat mit ml-Einheit in cost_summary

- **GIVEN** ein `MealItem` mit `ingredient` (`price_per_kg=2.50`, `density=1.0`), `quantity=500`, `measuring_unit.name="ml"`, `factor=1.0`
- **AND** `effective_portions=10`
- **WHEN** `cost_summary` berechnet wird
- **THEN** SHALL `weight_g = 500 * 1.0 * 1.0 * 10 = 5000g` für die Preisberechnung gelten
- **AND** SHALL `price = 2.50 / 1000 * 5000 = 12.50 EUR` sein

#### Scenario: Konsistenz nutrition_summary und cost_summary bei Direktzutaten

- **GIVEN** dieselbe Direktzutat in einem Plan
- **WHEN** `nutrition_summary` und `cost_summary` aufgerufen werden
- **THEN** SHALL das interne `weight_g` für diese Zutat in beiden Endpunkten identisch sein

### Requirement: Rezepte mit portions=0 werden in allen Berechnungen geskippt

Das System SHALL Rezepte mit `portions=0` oder `portions=None` aus allen Berechnungen (nutrition_summary, cost_summary, shopping_service) ausschließen und ein Warning loggen. Ein stilles Normieren auf `portions=1` ist nicht mehr erlaubt.

#### Scenario: Rezept mit portions=0 trägt nicht zur Nährwertberechnung bei

- **GIVEN** ein `MealItem` mit einem Rezept das `portions=0` hat
- **WHEN** `nutrition_summary` berechnet wird
- **THEN** SHALL dieses Rezept keinen Beitrag zu `energy_kcal` oder anderen Nährwerten liefern

#### Scenario: Rezept mit portions=0 erscheint nicht auf Einkaufsliste

- **GIVEN** ein `MealItem` mit einem Rezept das `portions=0` hat
- **WHEN** Einkaufsliste generiert wird
- **THEN** SHALL keine Zutaten dieses Rezepts auf der Einkaufsliste erscheinen

#### Scenario: Warning wird geloggt

- **GIVEN** ein Rezept mit `portions=0` ist in einem Plan enthalten
- **WHEN** eine beliebige Berechnung über diesen Plan ausgeführt wird
- **THEN** SHALL `logger.warning` mit Rezept-ID und -Titel aufgerufen werden
