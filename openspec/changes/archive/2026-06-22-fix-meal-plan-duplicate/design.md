## Context

`duplicate_meal_plan` in `api/meal_plan.py` (ca. Zeile 294–338):
1. Lädt `source.meals.all()` — enthält reguläre Meals **und** RefMeals (die `start_datetime=None` haben)
2. Berechnet `offset = new_start - source.start_datetime` und addiert ihn auf `meal.start_datetime + offset` → `TypeError` wenn `start_datetime is None`
3. Klont `MealItem`-Records, aber ignoriert `MealItemOverride`-Records
4. Übernimmt nicht: `day_part_factors`, `meal_default_times`, `nutritional_tags`, `visibility`

## Goals / Non-Goals

**Goals:**
- Duplizieren schlägt nie mit `TypeError` fehl
- Alle `MealItemOverride`-Einträge werden mitkopiert
- Metadata-Felder (`day_part_factors`, `meal_default_times`, `nutritional_tags`, `visibility`) werden auf den Klon übertragen

**Non-Goals:**
- RefMeals selbst klonen (RefMeals sind planspezifische Schablonen — es ist korrekt, sie nicht zu kopieren)

## Decisions

**D1 — RefMeals beim Duplizieren überspringen**
Meals mit `is_reference=True` (oder `start_datetime is None`) werden beim Klonen übersprungen. RefMeals müssen im neuen Plan neu angelegt werden.

**D2 — MealItemOverrides klonen**
```python
for item in meal.items.all():
    new_item = MealItem.objects.create(meal=new_meal, ...)
    for override in item.overrides.all():
        MealItemOverride.objects.create(meal_item=new_item, ...)
```

**D3 — Metadata übertragen**
Nach dem Klonen des Plans:
```python
new_plan.day_part_factors = source.day_part_factors
new_plan.meal_default_times = source.meal_default_times
new_plan.visibility = source.visibility
new_plan.save(update_fields=[...])
new_plan.nutritional_tags.set(source.nutritional_tags.all())
```

## Risks / Trade-offs

- RefMeals nicht zu klonen kann Nutzer überraschen. Ein Hinweis in der UI oder im API-Response wäre hilfreich, ist aber kein Blocker.
