# meal-plan Specification (Delta)

## Modified Requirements

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

## Implementation Notes

- Datei: `backend/planner/api/meal_plan.py`, Funktion `cost_summary`
- `recipe_costs`-Dict um Feld `cost_per_person` erweitern (Decimal, initial 0)
- Im Meal-Loop: `recipe_costs[rid]["cost_per_person"] += recipe_item_cost / effective_portions`
- Im Output-Building: `"cost_per_person": rc["cost_per_person"]` statt Division durch `norm_portions`
- Test: `planner/tests/test_meal_time_and_portions.py` — Testfall für override_portions in cost_summary
