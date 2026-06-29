# meal-item-override-calc Specification

## Purpose

`MealItemOverride`-Objekte (Felder `excluded`, `quantity_override`) MÜSSEN in der Nährwert- und Kostenberechnung des `nutrition_summary`- und `cost_summary`-Endpunkts ausgewertet werden. Bisher sind sie totes Code.

## Requirements

### Requirement: excluded-Override entfernt Item aus Berechnung

Das System SHALL ein `RecipeItem` aus der Nährwert- und Kostenberechnung vollständig ausschließen, wenn ein `MealItemOverride` mit `excluded=True` für dieses `recipe_item_id` auf dem zugehörigen `MealItem` existiert.

#### Szenario: Ausgeschlossenes Item zählt nicht

- **GIVEN** ein `MealItem` mit Rezept, das 3 Zutaten hat
- **AND** ein `MealItemOverride` mit `excluded=True` für Zutat #2
- **WHEN** `nutrition_summary` oder `cost_summary` berechnet wird
- **THEN** soll nur Zutat #1 und #3 zur Berechnung beitragen

### Requirement: quantity_override ersetzt Original-Menge

Das System SHALL die Original-Menge eines `RecipeItem` durch `quantity_override` ersetzen, wenn ein `MealItemOverride` mit gesetztem `quantity_override` existiert und `excluded=False`.

#### Berechnungsformel mit Override

```
effective_quantity = override.quantity_override  # statt ri.quantity
weight_g = effective_quantity * ri.portion.weight_g
```

#### Szenario: Mengen-Override in Nährwertberechnung

- **GIVEN** ein `RecipeItem` mit `quantity=4` und `portion.weight_g=25g` (→ 100g)
- **AND** ein `MealItemOverride` mit `quantity_override=2` für dieses Item
- **THEN** soll `weight_g = 2 * 25 = 50g` verwendet werden (nicht 100g)

### Requirement: Override-Lookup ist effizient

Das System SHALL Overrides einmalig als Dictionary `{recipe_item_id: override}` laden, nicht per RecipeItem eine DB-Abfrage machen.

#### Implementierungsdetail

```python
overrides_map = {o.recipe_item_id: o for o in item.overrides.all()}
```

Der `overrides`-Prefetch MUSS zum Queryset in `nutrition_summary` und `cost_summary` hinzugefügt werden.

### Requirement: Scope

`MealItemOverride` wird NUR in `nutrition_summary` und `cost_summary` ausgewertet. `shopping_service`, `MealItemOut.resolve_energy_kcal`, `cooking_schedule_service` bleiben unverändert.

## Implementation Notes

- Datei: `backend/planner/api/meal_plan.py`, Funktionen `nutrition_summary` und `cost_summary`
- Prefetch: `"items__overrides"` zum jeweiligen Queryset hinzufügen
- Override-Check vor dem `weight_g`-Assignment im RecipeItem-Loop einfügen
