## Why

Das Duplizieren eines MealPlans ist auf zwei Weisen kaputt: (1) `MealItemOverride`-Einträge werden beim Klonen nicht mitkopiert — sie gehen still verloren. (2) Wenn der Quellplan RefMeals enthält (die `null`-Datetimes haben), crasht der Duplikat-Endpunkt mit `TypeError: unsupported operand type(s) for +: 'NoneType' and 'datetime.timedelta'`. Zusätzlich werden beim Duplizieren `day_part_factors`, `nutritional_tags`, `meal_default_times` und `visibility` nicht übernommen.

## What Changes

- `duplicate_meal_plan` (`api/meal_plan.py`): RefMeals mit `null`-Datetimes überspringen oder separat behandeln (ohne Offset-Addition)
- `MealItemOverride`-Einträge für jedes geklonte `MealItem` ebenfalls klonen
- `day_part_factors`, `meal_default_times`, `nutritional_tags` und `visibility` aus dem Quellplan auf den Klon übertragen

## Capabilities

### New Capabilities
_(kein neues Feature)_

### Modified Capabilities
_(keine Spec-Level-Änderungen)_

## Impact

- **Backend**: `backend/planner/api/meal_plan.py` (Duplikat-Endpunkt)
- **Keine Frontend-Änderungen**, keine Migrationen
