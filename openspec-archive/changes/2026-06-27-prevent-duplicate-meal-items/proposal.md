## Why

In einem Meal können aktuell mehrfach dasselbe Rezept oder dieselbe Zutat als separate MealItems angelegt werden — das ist fast immer ein Benutzerfehler. Eine doppelte Kartoffelsuppe oder zweimal "Tomaten" als Einzelzutat in derselben Mahlzeit ergeben fachlich keinen Sinn und führen zu falschen Nährwertberechnungen, verzerrten Kosten und kaputten Einkaufslisten.

## What Changes

- **Neue DB-Constraints**: Zwei partial unique constraints auf `MealItem` — `(meal, recipe)` und `(meal, ingredient)` — verhindern Duplikate auf Datenbankebene
- **API-Validierung**: `add_meal_item`, `set_wizard_items`, `update_ref_meal`, `sync_ref_meal`, `link_meal` und `copy_items_from_plan` prüfen vor dem Anlegen auf Duplikate und geben deutsche Fehlermeldungen zurück
- **Frontend-Hinweis**: Im `RecipeSearchDialog` werden bereits im Meal enthaltene Rezepte/Zutaten visuell markiert (ausgegraut + "Bereits enthalten")
- **Bulk-Operationen**: Bei Duplikat in sync/copy/link wird die gesamte Operation mit einem Rollback abgebrochen

## Capabilities

### New Capabilities

- `meal-item-uniqueness`: Validierungslogik, die doppelte Rezepte und Einzelzutaten innerhalb eines Meals verhindert — auf DB-, API- und UI-Ebene

### Modified Capabilities

- *(keine — die Änderung fügt neue Restriktionen hinzu, verändert aber keine bestehenden Spec-Anforderungen)*

## Impact

- **Backend**: `planner/models/meal_plan.py` (MealItem.Meta.constraints), API-Endpunkte in `planner/api/meal_plan.py` und `planner/api/ref_meal.py`
- **Schemas**: Keine Schema-Änderungen nötig (Input/Output bleiben gleich)
- **Frontend**: `frontend-food/src/pages/planning/RecipeSearchDialog.tsx` (visueller Hinweis)
- **Migration**: Neue Migration für die zwei UniqueConstraints
- **Tests**: Neue Tests für Duplikats-Verhalten in allen betroffenen Endpunkten
