## Context

Ein `Meal` hat `MealItem`s, die entweder ein `Recipe` oder ein `Ingredient` referenzieren (XOR-Constraint). Aktuell gibt es keine Prüfung auf doppelte Rezepte oder Zutaten innerhalb eines Meals — dasselbe Rezept oder dieselbe Zutat kann mehrfach in derselben Mahlzeit vorkommen.

Betroffene Endpunkte:
- `POST /api/meal-plans/{id}/meals/{meal_id}/items/` — einzelnes Item hinzufügen
- `POST /api/meal-plans/{id}/meals/{meal_id}/wizard-items/` — atomarer Replace (Wizard)
- `PUT /api/meal-plans/{plan_id}/ref-meals/{ref_meal_id}/` — RefMeal-Update (atomarer Replace)
- `POST /api/meal-plans/{plan_id}/ref-meals/{ref_meal_id}/sync` — RefMeal syncen
- `POST /api/meal-plans/{plan_id}/meals/{meal_id}/link` — Meal an RefMeal linken
- `POST /api/meal-plans/{id}/meals/{meal_id}/copy-items-from/` — Items aus anderem Plan kopieren

## Goals / Non-Goals

**Goals:**
- Kein `Meal` kann zwei MealItems mit derselben `recipe_id` haben
- Kein `Meal` kann zwei MealItems mit derselben `ingredient_id` haben
- Klare, deutsche Fehlermeldungen bei Verstoß
- Frontend zeigt im RecipeSearchDialog bereits enthaltene Items visuell an
- Bulk-Operationen (sync, copy, link) machen bei Duplikat einen Rollback

**Non-Goals:**
- Keine Prüfung auf Duplikate von RecipeItems innerhalb eines Rezepts (das ist ein Rezept-Problem, nicht Meal-Problem)
- Keine Prüfung auf gleiche Zutat via Recipe vs. standalone Ingredient (z.B. "Tomaten" als RecipeItem in Pasta + "Tomaten" als standalone MealItem — das ist erlaubt)
- Keine Änderung der Datenbankschemas außerhalb der neuen Constraints

## Decisions

### 1. DB-Constraints als unterste Schicht

Zwei partial unique constraints auf `MealItem`, die on-DB-Ebene Duplikate verhindern:

```python
models.UniqueConstraint(
    fields=["meal", "recipe"],
    condition=models.Q(recipe__isnull=False),
    name="unique_recipe_per_meal",
),
models.UniqueConstraint(
    fields=["meal", "ingredient"],
    condition=models.Q(ingredient__isnull=False),
    name="unique_ingredient_per_meal",
),
```

**Rationale**: Nur API-Validierung würde Race-Conditions zwischen Check und Create nicht abfangen. DB-Constraints sind der einzige Weg, Duplikate garantiert zu verhindern — auch bei Bulk-Operationen, parallelen Requests oder zukünftigen neuen Endpunkten.

**Alternative**: Check in `MealItem.clean()` — aber Django ruft `clean()` nicht automatisch bei `create()` auf, nur bei `full_clean()`. Wäre kein zuverlässiger Schutz.

### 2. Zentrale Validierungs-Helfer

Eine Funktion `raise_if_duplicate_meal_item(meal, recipe_id=None, ingredient_id=None)` im API-Modul, die vor jedem Create prüft und bei Treffer ein `HttpError(422, ...)` wirft.

Für Bulk-Inputs (Wizard, RefMeal) wird die Input-Liste vorab auf interne Duplikate geprüft, bevor DB-Operations starten.

### 3. Rollback bei Bulk-Operationen

`sync_ref_meal`, `link_meal`, `copy_items_from_plan`: Diese löschen erst alle bestehenden Items und legen neue an. Prüfung erfolgt auf der Source-Seite (RefMeal-Items oder Quell-Meal-Items). Bei Duplikat in der Source → `HttpError(422)` vor dem Delete.

### 4. Frontend-Visualisierung

`RecipeSearchDialog` bekommt eine Prop/Parameter `excludedRecipeIds` und `excludedIngredientIds` (bereits im Meal enthaltene IDs). Ergebnisse, die darin vorkommen, werden mit `opacity-50` und dem Text "Bereits enthalten" markiert und sind nicht auswählbar.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Race Condition**: Zwei parallele Requests fügen dasselbe Rezept kurz nacheinander hinzu | DB-Constraints fangen den zweiten ab → IntegrityError wird zu HttpError(409) gemappt |
| **Bestehende Daten**: Schon existierende Duplikate in der DB | Die Migration muss vor dem Anlegen der Constraints bereinigen. Ein `RUN_SQL`-Schritt löscht Duplikate (behält das mit der kleinsten ID) |
| **Seed-Daten**: Seed-Data könnte versehentlich Duplikate enthalten | Seeds bereinigen oder mit `get_or_create` arbeiten |
| **RefMeal mit Duplikaten**: Ein RefMeal könnte durch Bug bereits Duplikate enthalten | Der sync/link schlägt dann fehl — das ist gut so, weil es einen Bug aufdeckt |

## Migration Plan

1. **Pre-Migration cleanup**: SQL-Script findet und löscht doppelte MealItems pro Meal (behält jeweils das mit der niedrigsten ID)
2. **Migration**: Neue Migration mit den zwei UniqueConstraints + Cleanup-Script
3. **Nichts brechen**: Da es vorher Duplikate gab, werden bestehende Daten bereinigt statt die Migration fehlschlagen zu lassen

## Open Questions

- *Gelöst durch User-Feedback*: DB+API-Validierung, Input-Prüfung bei Bulk, Frontend-Hinweis, Rollback bei Bulk
