## 1. Backend Model & Migration

- [x] 1.1 Neues Model `ShoppingListItemSource` in `shopping/models.py` erstellen (shopping_list_item FK, recipe FK nullable SET_NULL, meal FK nullable SET_NULL, quantity_g FloatField, recipe_name CharField cached, meal_label CharField cached)
- [x] 1.2 Migration generieren: `uv run python manage.py makemigrations shopping`
- [x] 1.3 Migration anwenden: `uv run python manage.py migrate`

## 2. Backend Service (Transiente Liste)

- [x] 2.1 Neues Dataclass `ShoppingItemSource` in `supply/services/shopping_service.py` (recipe_id, recipe_name, recipe_slug, meal_label, quantity_g)
- [x] 2.2 Feld `sources: list[ShoppingItemSource]` zum bestehenden `ShoppingListItem` Dataclass hinzufügen
- [x] 2.3 `generate_shopping_list` anpassen: beim Aggregieren Sources pro Ingredient mitsammeln (Recipe-Name, Meal-Label aus `meal.get_label()` oder ähnlich, Teilmenge)

## 3. Backend Service (Persistierte Liste)

- [x] 3.1 `from-meal-plan` Endpoint in `shopping/api.py` anpassen: beim Erstellen der ShoppingListItems auch ShoppingListItemSource-Einträge anlegen
- [x] 3.2 `from-recipe` Endpoint: einzelne Source mit dem Rezept anlegen

## 4. Backend Schemas & API

- [x] 4.1 Pydantic Schema `ShoppingItemSourceSchema` erstellen in `shopping/schemas.py` (recipe_id optional, recipe_name, recipe_slug optional, meal_label, quantity_g)
- [x] 4.2 Bestehende Item-Schemas um `sources: list[ShoppingItemSourceSchema]` erweitern
- [x] 4.3 API-Endpoint `GET /api/meal-plans/{id}/shopping-list/` gibt Sources mit aus
- [x] 4.4 API-Endpoint `GET /api/shopping-lists/{id}/` lädt Sources per select_related/prefetch mit

## 5. Frontend Schema & API

- [x] 5.1 Zod Schema `ShoppingItemSourceSchema` in `frontend/src/schemas/shoppingList.ts` erstellen
- [x] 5.2 Bestehendes Item-Schema um `sources` Array erweitern

## 6. Frontend UI

- [x] 6.1 `ShoppingListItemRow.tsx` um Expand/Collapse erweitern: Chevron-Icon, aufklappbare Sources-Liste
- [x] 6.2 Source-Zeile: Rezeptname als EntityLink (`type="recipe"`), Meal-Label, Teilmenge in grauer Schrift
- [x] 6.3 Chevron nur anzeigen wenn `sources.length > 0`
- [x] 6.4 Mobile-optimiert: eingerückte Sources mit kleinerer Schrift, Touch-friendly
