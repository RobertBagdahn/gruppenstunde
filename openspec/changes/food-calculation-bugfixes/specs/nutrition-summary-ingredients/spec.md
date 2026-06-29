# nutrition-summary-ingredients Specification

## Purpose

Der `GET /api/meal-plans/{id}/nutrition-summary/`-Endpunkt MUSS Ingredient-MealItems (direkte Zutaten, z.B. vom Breakfast-Wizard) in die Nährwertberechnung einbeziehen. Bisher werden sie durch ein frühzeitiges `continue` übersprungen.

## Requirements

### Requirement: Ingredient-MealItems in Nährwert-Aggregation

Das System SHALL Nährwerte für `MealItem`-Objekte mit `ingredient` (statt `recipe`) in `nutrition_summary` korrekt berechnen.

#### Berechnungsformel (Ingredient-MealItem)

```
weight_g = resolve_ingredient_weight_g(item)   # aus meal_item_helpers
scale    = weight_g / 100.0 * item.factor * (effective_portions / 1)
nutrient = ingredient.<field> * scale
```

`effective_portions` = `meal.effective_portions` (= `override_portions or norm_portions`).

#### Szenario: Nutrition Summary mit Direktzutat (g-Einheit)

- **GIVEN** ein Plan mit 10 Portionen und einer Mahlzeit ohne Override
- **AND** ein `MealItem` mit `ingredient` (energy_kcal=265/100g), `quantity=3`, `measuring_unit="g"`, `factor=1.0`
- **WHEN** `GET /api/meal-plans/{id}/nutrition-summary/` aufgerufen wird
- **THEN** soll `energy_kcal` um `3 * (265/100) * 10 = 79.5` steigen (total, nicht per-portion)

#### Szenario: Nutrition Summary mit Direktzutat (Portions-Einheit)

- **GIVEN** ein `MealItem` mit `ingredient` (energy_kcal=540/100g), `quantity=0.5`, Portion `weight_g=20g`, `factor=1.0`, `effective_portions=10`
- **WHEN** `GET /api/meal-plans/{id}/nutrition-summary/` aufgerufen wird
- **THEN** soll `energy_kcal` um `(0.5 * 20) * (540/100) * 1.0 * 10 = 540.0` steigen

#### Szenario: Per-Portion-Werte für Ingredient-MealItems

- **GIVEN** oben beschriebenes Szenario mit `effective_portions=10`
- **THEN** soll `per_portion_energy_kcal` um `540.0 / 10 = 54.0` steigen

### Requirement: Korrekte Gewichtung mit effective_portions

Das System SHALL bei Ingredient-MealItems `meal.effective_portions` verwenden (nicht `meal_plan.norm_portions`), konsistent mit `resolve_ingredient_energy_kcal` in `meal_item_helpers.py`.

### Requirement: Alle 7 Nährstofffelder

Das System SHALL alle 7 Felder (`energy_kcal`, `protein_g`, `fat_g`, `carbohydrate_g`, `sugar_g`, `fibre_g`, `salt_g`) für Ingredient-MealItems berechnen, analog zu den Rezept-Items.

## Implementation Notes

- Datei: `backend/planner/api/meal_plan.py`, Funktion `nutrition_summary`
- Die bestehende Helper-Funktion `_resolve_ingredient_weight_g` aus `planner/services/meal_item_helpers.py` SOLL importiert und verwendet werden
- Das frühe `if not mi.recipe: continue` MUSS durch separate Zweige für Recipe- und Ingredient-Items ersetzt werden
- Prefetch für `ingredient` in der `meal_items_qs`-Query ergänzen
