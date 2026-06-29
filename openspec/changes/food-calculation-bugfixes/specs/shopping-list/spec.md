# shopping-list Specification (Delta)

## Modified Requirements

### Requirement: Direktzutat mit g-Einheit verwendet mi.quantity

Bei Direktzutaten (`MealItem.ingredient`) mit `measuring_unit.name == "g"` SHALL das System `float(mi.quantity)` als `weight_g` verwenden — nicht `mi.measuring_unit.quantity` (das Feld existiert nicht auf `MeasuringUnit`).

#### Berechnungsformel (korrekt)

```python
if unit_name == "g":
    portion_weight = 1.0  # 1g pro g
    weight_g = float(mi.quantity or 0) * 1.0 * mi.factor * meal_scaling
```

Oder äquivalent — konsistent mit `meal_item_helpers._resolve_ingredient_weight_g`:

```python
if unit_name == "g":
    weight_g = float(mi.quantity or 0) * mi.factor * meal_scaling
```

#### Szenario: Direktzutat mit g-Einheit erscheint korrekt auf Einkaufsliste

- **GIVEN** ein `MealItem` mit `ingredient`, `quantity=180`, `measuring_unit.name="g"`, `factor=1.0`
- **AND** ein Plan mit `norm_portions=10`, `reserve_factor=1.1`
- **WHEN** Einkaufsliste generiert wird
- **THEN** soll `total_quantity_g = 180 * 1.0 * (10 * 1.1) = 1980g` sein

#### Szenario: Direktzutat mit ml-Einheit bleibt unverändert

- **GIVEN** ein `MealItem` mit `measuring_unit.name="ml"` und `ingredient.density=1.0`
- **THEN** soll `weight_g = quantity * density * factor * meal_scaling` sein (keine Änderung)

### Requirement: Bestehende Verhalten bleiben erhalten

Alle anderen Berechnungspfade im Shopping-Service (Rezept-Items, Direktzutaten mit Portions-Einheiten) bleiben semantisch unverändert.

## Implementation Notes

- Datei: `backend/supply/services/shopping_service.py`, Funktion `generate_shopping_list`
- Zeilen 198-203: Bedingung `unit_unit == "g" or unit_name == "g"` → `portion_weight = 1.0` setzen (nicht `mi.measuring_unit.quantity`)
- Test: `supply/tests/test_shopping_service.py` — neuer Testfall für g-Einheit Direktzutat
