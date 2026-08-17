## Why

Drei Runtime-Bugs und vier Namens-Inkonsistenzen im Food-Bereich. Die Runtime-Bugs führen zu `AttributeError`-Abstürzen oder ungültigen Datenbankwerten (Shopping-View-Endpoint crasht, `seed_all.py` verwendet nicht existierende Enum-Werte). Die Namens-Inkonsistenzen (`meal_event`-Altlasten) sind Relikte der MealEvent→MealPlan-Umbenennung und erhöhen den kognitiven Aufwand für Entwickler und KI-Agenten.

## What Changes

### Runtime-Bugs (crashen)
- **Shopping View Endpoint fix**: `shopping/api.py` Zeilen 201, 224, 239 — `item.portion.ingredient` wird durch `item.ingredient` ersetzt, da `ShoppingListItem` kein `portion`-Feld hat
- **ENERGY_KJ → ENERGY_KCAL**: `seed_all.py` Zeilen 2235–2656 — `HintParameterChoices.ENERGY_KJ` durch existierenden Wert `ENERGY_KCAL` ersetzen (5 Stellen)
- **"liquid" → "beverage"**: `seed_all.py` Zeile 1583 — ungültigen Wert `"liquid"` durch gültigen Choice `"beverage"` ersetzen. `url_import_service.py:572` Workaround für `"liquid"` mitbereinigen

### Namens-Inkonsistenzen (falsch, aber lauffähig)
- **Rule-Scope `meal_event` → `meal_plan`** **BREAKING**: `recipe/models/rule.py` (Enum-Konstante + DB-Wert), `nutrition_aggregation.py`, `suggestion_service.py`, `seed_rules.py`, Tests — überall `"meal_event"` durch `"meal_plan"` ersetzen. Data-Migration für existierende Rule-Records.
- **`SourceType.MEAL_EVENT` → `MEAL_PLAN`** **BREAKING**: `shopping/models.py` (Konstante + DB-Wert), `shopping/api.py`, Tests. Data-Migration für existierende ShoppingList-Records.
- **`db_column="meal_event_id"`** auf Meal-Model (`planner/models/meal_plan.py:243`): Alias-Kolumne auf `meal_plan_id` umbenennen. Migration für DB-Column-Rename.
- **Frontend `meal_event` Label-Key**: `frontend-food/src/schemas/shoppingList.ts:119` — Key von `meal_event` auf `meal_plan` ändern

## Capabilities

### New Capabilities

Keine — reine Bugfixes und Bereinigungen ohne neue Features.

### Modified Capabilities

- `shopping-list`: View-Endpoint Namensauflösung von `portion.ingredient` auf `ingredient` korrigiert. `SourceType.MEAL_EVENT`→`MEAL_PLAN` umbenannt.
- `meal-plan`: Rule-Scope `meal_event`→`meal_plan` in Aggregation und Suggestions. `Meal.db_column` von `meal_event_id` auf `meal_plan_id`.

## Impact

- **Backend**: `shopping/api.py` (3 Zeilen), `shopping/models.py` (1 Zeile), `recipe/models/rule.py` (1 Zeile), `recipe/services/nutrition_aggregation.py` (1 Zeile), `recipe/services/suggestion_service.py` (1 Zeile), `recipe/services/url_import_service.py` (1 Zeile), `recipe/management/commands/seed_rules.py` (6 Zeilen), `core/management/commands/seed_all.py` (6 Zeilen), `planner/models/meal_plan.py` (1 Zeile), Tests (~5 Dateien)
- **Frontend**: `frontend-food/src/schemas/shoppingList.ts` (1 Zeile)
- **Migrationen**: 3 — Rule.scope Data-Migration, SourceType Data-Migration, Meal.db_column Rename
- **Tests**: Assert-Korrektur in `shopping/tests/test_api.py:460` (`>= 0` → `> 0`), Scope-String-Anpassungen in `test_seed_rules.py`, `test_nutrition_aggregation.py`
