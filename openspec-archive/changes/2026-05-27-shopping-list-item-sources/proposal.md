## Why

Beim Generieren einer Einkaufsliste aus einem MealPlan geht die Information verloren, aus welchem Rezept/welcher Mahlzeit eine Zutat stammt. Nutzer sehen z.B. "Kartoffel 7038 g" ohne zu wissen, dass 3500 g aus der Kartoffelsuppe und 3538 g aus dem Kartoffelbrot kommen. Diese Transparenz ist essentiell für die Planung (Fehler erkennen, Mengen nachvollziehen, einzelne Rezepte anpassen).

## What Changes

- Neues Model `ShoppingListItemSource` als 1:n Breakdown-Tabelle zu `ShoppingListItem` (recipe FK, meal FK, quantity_g)
- `generate_shopping_list` Service sammelt Herkunftsinformationen pro Zutat mit (Rezeptname, Mahlzeit-Label, Teilmenge)
- Neues Dataclass-Feld `sources: list[ShoppingItemSource]` im transienten `ShoppingListItem`
- Backend-Schemas erweitert um Sources-Daten in der API-Response
- Frontend: Expand/Collapse pro Einkaufslisten-Item zeigt Rezept-Herkunft mit Teilmengen
- Zod-Schema erweitert um Sources-Array

## Capabilities

### New Capabilities
- `shopping-list-item-sources`: Herkunfts-Tracking für Einkaufslisten-Items — zeigt welches Rezept/welche Mahlzeit wie viel zu einer Zutat beiträgt

### Modified Capabilities
- `shopping-list`: Bestehende Einkaufslisten-API liefert zusätzlich Sources-Daten aus

## Impact

- **Backend Apps**: `shopping` (neues Model + Migration), `supply` (Service-Änderung)
- **Schemas**: `shopping/schemas.py` (Pydantic), `frontend/src/schemas/shoppingList.ts` (Zod)
- **API**: `GET /api/meal-plans/{id}/shopping-list/` und `GET /api/shopping-lists/{id}/` liefern Sources mit
- **Frontend**: `ShoppingListItemRow.tsx` bekommt Expand/Collapse-Logik
- **Migration**: Neue Tabelle `shopping_shoppinglistitemsource`
