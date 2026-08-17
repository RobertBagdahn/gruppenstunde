## 1. Shopping View Endpoint Fix

- [x] 1.1 Korrigiere `item.portion.ingredient.name` → `item.ingredient.name if item.ingredient else item.name` in `backend/shopping/api.py` Zeilen 201, 224, 239 (drei identische Stellen im `get_shopping_list_view` Endpoint)

## 2. ENERGY_KJ → ENERGY_KCAL Fix

- [x] 2.1 Ersetze `HintParameterChoices.ENERGY_KJ` durch `HintParameterChoices.ENERGY_KCAL` in `backend/core/management/commands/seed_all.py` (5 Stellen: Zeilen 2235, 2245, 2255, 2265, 2656)

## 3. "liquid" → "beverage" Fix

- [x] 3.1 Ersetze `"liquid"` durch `"beverage"` in `backend/core/management/commands/seed_all.py` Zeile 1583
- [x] 3.2 Bereinige `"liquid"`-Workaround in `backend/recipe/services/url_import_service.py` Zeile 572: ändere `if data.physical_viscosity in ("liquid", "beverage")` zu `if data.physical_viscosity == PhysicalViscosityChoices.BEVERAGE`

## 4. Rule-Scope `meal_event` → `meal_plan`

- [x] 4.1 Benenne `RuleScopeChoices.MEAL_EVENT` → `MEAL_PLAN` in `backend/recipe/models/rule.py` (Konstante + DB-Wert `"meal_event"` → `"meal_plan"`)
- [x] 4.2 Erstelle Migration: `uv run python manage.py makemigrations recipe` für die Rule.scope-Änderung
- [x] 4.3 Erstelle Data-Migration: `UPDATE recipe_rule SET scope = 'meal_plan' WHERE scope = 'meal_event'`
- [x] 4.4 Ersetze `"meal_event"` String durch `"meal_plan"` in `backend/recipe/services/nutrition_aggregation.py:231`
- [x] 4.5 Ersetze `"meal_event"` String durch `"meal_plan"` in `backend/recipe/services/suggestion_service.py:170`
- [x] 4.6 Ersetze `"scope": "meal_event"` durch `"meal_plan"` in `backend/recipe/management/commands/seed_rules.py` (6 Stellen)
- [x] 4.7 Ersetze `"meal_event"` durch `"meal_plan"` in `backend/recipe/tests/test_seed_rules.py` und `backend/recipe/tests/test_nutrition_aggregation.py`

## 5. SourceType `MEAL_EVENT` → `MEAL_PLAN`

- [x] 5.1 Benenne `SourceType.MEAL_EVENT` → `MEAL_PLAN` in `backend/shopping/models.py` (Konstante + DB-Wert `"meal_event"` → `"meal_plan"`)
- [x] 5.2 Erstelle Migration: `uv run python manage.py makemigrations shopping` für die SourceType-Änderung
- [x] 5.3 Erstelle Data-Migration: `UPDATE shopping_shoppinglist SET source_type = 'meal_plan' WHERE source_type = 'meal_event'`
- [x] 5.4 Ersetze `SourceType.MEAL_EVENT` durch `SourceType.MEAL_PLAN` in `backend/shopping/api.py:501`
- [x] 5.5 Ersetze `"meal_event"` durch `"meal_plan"` in `backend/shopping/tests/test_api.py:458`
- [x] 5.6 Ersetze `meal_event` Key durch `meal_plan` in `frontend-food/src/schemas/shoppingList.ts:119`

## 6. Meal `db_column` Rename

- [x] 6.1 Entferne `db_column="meal_event_id"` und setze `db_column="meal_plan_id"` in `backend/planner/models/meal_plan.py:243`
- [x] 6.2 Erstelle Migration: `uv run python manage.py makemigrations planner` für den DB-Column-Rename

## 7. Verification

- [x] 7.1 Verifiziere Code korrigiert: Shopping-View greift jetzt auf `item.ingredient` zu (kein `portion`-Feld mehr)
- [x] 7.2 Verifiziere Enum-Werte: `HintParameterChoices.ENERGY_KCAL` = `energy_kcal` ✓
- [x] 7.3 Verifiziere Enum-Werte: `PhysicalViscosityChoices.BEVERAGE` = `beverage` ✓
- [x] 7.4 Verifiziere Rule-Scope: `RuleScopeChoices.MEAL_PLAN` = `meal_plan` ✓
- [x] 7.5 Verifiziere SourceType: `SourceType.MEAL_PLAN` = `meal_plan` ✓
- [x] 7.6 Migrationen geprüft: `makemigrations --check` zeigt `No changes detected`
