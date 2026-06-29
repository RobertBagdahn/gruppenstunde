# meal-plan Specification

## MODIFIED Requirements

### Requirement: cost_summary recipe cost_per_person nutzt effective_portions

Das System SHALL `cost_per_person` pro Rezept im `cost_summary`-Endpunkt auf Basis der `effective_portions` der jeweiligen Mahlzeit berechnen — nicht durch das globale `norm_portions` des Plans teilen.

#### Aktuell (falsch)

```python
"cost_per_person": rc["total_cost"] / norm_portions
```

Das dividiert alle Rezept-Gesamtkosten durch `norm_portions`, auch wenn das Rezept in einer Mahlzeit mit `override_portions=20` verwendet wurde.

#### Korrekt

`cost_per_person` pro Rezept ist die Summe der je-Mahlzeit-Pro-Person-Kosten für dieses Rezept:

```python
# In der Meal-Loop:
recipe_cost_per_person = recipe_item_cost / effective_portions
recipe_costs[rid]["cost_per_person"] += recipe_cost_per_person

# Im Output:
"cost_per_person": rc["cost_per_person"]  # keine weitere Division
```

#### Szenario: Rezept in Mahlzeit mit override_portions

- **GIVEN** ein Plan mit `norm_portions=10`
- **AND** eine Mahlzeit mit `override_portions=20`
- **AND** ein Rezept in dieser Mahlzeit mit Gesamtkosten 40€
- **WHEN** `GET /api/meal-plans/{id}/costs/` aufgerufen wird
- **THEN** soll `recipe.cost_per_person = 40 / 20 = 2.00€` sein (nicht `40 / 10 = 4.00€`)

#### Szenario: Rezept in mehreren Mahlzeiten mit unterschiedlichen Portionen

- **GIVEN** ein Rezept in Mahlzeit A (`effective_portions=10`, Kosten=20€) und Mahlzeit B (`effective_portions=20`, Kosten=40€)
- **THEN** soll `recipe.cost_per_person = 20/10 + 40/20 = 2 + 2 = 4.00€` sein

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
