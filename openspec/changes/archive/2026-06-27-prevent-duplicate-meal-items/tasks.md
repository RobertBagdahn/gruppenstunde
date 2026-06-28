## 1. Datenbank-Migration

- [x] 1.1 Duplikat-Cleanup-Script schreiben: finde doppelte MealItems (gleiches meal + recipe oder meal + ingredient), behalte jeweils das mit der niedrigsten ID
- [x] 1.2 Migration erstellen: zwei partial unique constraints `unique_recipe_per_meal` und `unique_ingredient_per_meal` auf MealItem

## 2. Backend — Validierungs-Helfer

- [x] 2.1 Hilfsfunktion `raise_if_duplicate_meal_item(meal, recipe_id, ingredient_id)` in `planner/api/meal_plan.py` — prüft auf existierende MealItems mit derselben recipe_id oder ingredient_id im selben Meal, wirft HttpError(422) mit deutscher Fehlermeldung
- [x] 2.2 Hilfsfunktion `check_duplicates_in_input(items: list)` für Wizard/RefMeal-Inputs — prüft auf doppelte recipe_id/ingredient_id innerhalb der Input-Liste

## 3. Backend — API-Validierung in add_meal_item

- [x] 3.1 In `add_meal_item`: vor `MealItem.objects.create()` die `raise_if_duplicate_meal_item`-Prüfung einbauen

## 4. Backend — API-Validierung in set_wizard_items

- [x] 4.1 In `set_wizard_items`: Input-Liste mit `check_duplicates_in_input` prüfen, bei Duplikat HttpError(422) werfen

## 5. Backend — API-Validierung in update_ref_meal

- [x] 5.1 In `update_ref_meal`: Input-Liste mit `check_duplicates_in_input` prüfen, bei Duplikat HttpError(422) werfen

## 6. Backend — API-Validierung in Bulk-Operationen

- [x] 6.1 In `sync_ref_meal`: RefMeal-Items vor dem Löschen/Sync auf Duplikate prüfen, bei Treffer HttpError(422) + kein Schreiben
- [x] 6.2 In `link_meal`: RefMeal-Items vor dem Löschen/Linken auf Duplikate prüfen, bei Treffer HttpError(422)
- [x] 6.3 In `copy_items_from_plan`: Quell-Items vor dem Kopieren auf Duplikate prüfen, bei Treffer HttpError(422)

## 7. Backend — IntegrityError-Handling

- [x] 7.1 Safe-Create-Helper `_create_meal_item`/`_create_ref_meal_item` mit try/except IntegrityError → HttpError(409)

## 8. Backend — Tests

- [x] 8.1 Test: add_meal_item mit Duplikat-Rezept → 422
- [x] 8.2 Test: add_meal_item mit Duplikat-Zutat → 422
- [x] 8.3 Test: add_meal_item mit einmaligem Rezept → 200
- [x] 8.4 Test: set_wizard_items mit Duplikat in Input → 422
- [x] 8.5 Test: sync_ref_meal mit Duplikat im RefMeal → 422
- [x] 8.6 Test: link_meal mit Duplikat im RefMeal → 422
- [x] 8.7 Test: copy_items_from_plan mit Duplikat → 422
- [x] 8.8 Test: IntegrityError wird zu 409 gemappt (_create_meal_item helper)
- [x] 8.9 Test: Zutat aus Rezept + standalone Zutat ist erlaubt
- [x] 8.10 Test: create_ref_meal mit Duplikaten in items → 422
- [x] 8.11 Test: update_ref_meal mit Duplikaten in items → 422

## 9. Frontend — RecipeSearchDialog

- [x] 9.1 RecipeSearchDialog akzeptiert Props `excludedRecipeIds: Set<number>` und `excludedIngredientIds: Set<number>`
- [x] 9.2 Suchergebnisse, die in excluded-Mengen sind, werden mit `opacity-50` und "Bereits enthalten"-Label dargestellt
- [x] 9.3 Bereits enthaltene Items sind nicht auswählbar (disabled/kein onClick)
- [x] 9.4 Aufrufende Stellen (MealSlot, RefMealEditor) übergeben die aktuellen meal-item-IDs an den Dialog

## 10. Migration ausführen

- [x] 10.1 `uv run python manage.py makemigrations` ausführen
- [x] 10.2 `uv run python manage.py migrate` ausführen
- [x] 10.3 Tests laufen lassen: 11 new + 74 existing pass, 5 pre-existing failures unrelated
