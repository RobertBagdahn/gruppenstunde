## Context

Der Shopping-View-Endpoint (`GET /api/shopping-lists/{id}/view/`) greift auf ein nicht existierendes `portion`-Feld des `ShoppingListItem`-Models zu. Das Model hat nur `ingredient` (FK auf `supply.Ingredient`).

Zwei Bugs im `seed_all.py` Management-Command verwenden nicht existierende Enum-Werte: `HintParameterChoices.ENERGY_KJ` (heißt `ENERGY_KCAL`) und `"liquid"` (kein gültiger `physical_viscosity`-Choice).

Vier Stellen enthalten `meal_event`-Referenzen als Altlast der MealEvent→MealPlan-Umbenennung: Rule-Scopes, SourceType, Meal.db_column, und Frontend-Label-Key.

## Goals / Non-Goals

**Goals:**
- Shopping-View-Endpoint mit korrekter `ingredient`-basierter Namensauflösung fixen
- `ENERGY_KJ` → `ENERGY_KCAL` in seed_all.py (5 Stellen)
- `"liquid"` → `"beverage"` in seed_all.py + Workaround in url_import_service.py bereinigen
- `meal_event` → `meal_plan` in Rule-Scopes, SourceType, Meal.db_column, und Frontend-Label
- Data-Migrationen für existierende DB-Records

**Non-Goals:**
- Keine neuen Features
- Keine Schema-Änderungen (Pydantic/Zod unverändert)
- Keine UI-Änderungen außer dem einen Label-Key

## Decisions

### Decision 1: `item.portion.ingredient.name` → `item.ingredient.name`

**Rationale**: `ShoppingListItem`-Model hat `ingredient`-Feld (FK zu `supply.Ingredient`), aber kein `portion`-Feld. Dreimal identisch im View-Endpoint (`shopping/api.py:201,224,239`).

```python
# Vorher (falsch):
"name": item.portion.ingredient.name if item.portion and item.portion.ingredient else item.name,
# Nachher (richtig):
"name": item.ingredient.name if item.ingredient else item.name,
```

### Decision 2: `ENERGY_KJ` → `ENERGY_KCAL`

**Rationale**: `supply/choices.py:60` definiert `ENERGY_KCAL = "energy_kcal"`. `ENERGY_KJ` existiert nicht. Migration 0030 hat `cached_energy_kj`→`cached_energy_kcal` umbenannt.

### Decision 3: `"liquid"` → `"beverage"`

**Rationale**: `PhysicalViscosityChoices` hat nur `SOLID = "solid"` und `BEVERAGE = "beverage"`. Der Workaround in `url_import_service.py:572` (`if data.physical_viscosity in ("liquid", "beverage")`) wird auf Enum-Verwendung umgestellt.

### Decision 4: Rule-Scope `"meal_event"` → `"meal_plan"` (Data-Migration)

**Rationale**: Das MealEvent-Model wurde zu MealPlan umbenannt (Migration 0006), aber die Rule-Scope-Choices und DB-Werte blieben auf `"meal_event"`. Für Konsistenz wird der Scope-Wert in der Datenbank migriert.

**Migration-Strategie**: `UPDATE recipe_rule SET scope = 'meal_plan' WHERE scope = 'meal_event'`

### Decision 5: `SourceType.MEAL_EVENT` → `MEAL_PLAN` (Data-Migration)

**Rationale**: Gleicher Grund wie #4. Der Enum-Wert `"meal_event"` wird zu `"meal_plan"`.

**Migration-Strategie**: `UPDATE shopping_shoppinglist SET source_type = 'meal_plan' WHERE source_type = 'meal_event'`

### Decision 6: `db_column="meal_event_id"` → `db_column="meal_plan_id"` (DB-Column-Rename)

**Rationale**: Der Fremdschlüssel `Meal.meal_plan` verwendet noch den alten DB-Spaltennamen `meal_event_id`. Eine Rename-Migration bringt DB-Schema und Model in Einklang.

**Migration-Strategie**: `ALTER TABLE planner_meal RENAME COLUMN meal_event_id TO meal_plan_id`

### Decision 7: Frontend `meal_event` → `meal_plan` Label-Key

**Rationale**: `frontend-food/src/schemas/shoppingList.ts:119` hat `SOURCE_TYPE_LABELS` mit Key `meal_event`. Der Key wird auf `meal_plan` geändert (der Value `'Essensplan'` bleibt korrekt).

## Risiken / Trade-offs

- **[Risk] Data-Migrationen auf Rule.scope brechen existierende Scope-Filter** → Daten in Testumgebung prüfen; nur `"meal_event"`→`"meal_plan"` migrieren, andere Scopes unverändert lassen
- **[Risk] DB-Column-Rename auf `meal_event_id` kann laufende Queries beeinträchtigen** → Migration im Deployments-Fenster mit kurzer Downtime; betrifft nur eine Spalte
- **[Risk] seed_all.py wird selten ausgeführt** → Bugs treten nur beim Seeden auf, trotzdem behoben werden
- **[Risk] Shopping-View könnte von Frontend genutzt werden** → Wird aktuell gecrashed sein; nach Fix funktioniert es korrekt
- **[Risk] Überschneidung mit `delete-dead-code`** Change (#6 `db_column`) → Als erledigt markieren falls `delete-dead-code` zuerst implementiert wird
