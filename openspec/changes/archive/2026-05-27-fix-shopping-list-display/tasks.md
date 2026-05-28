## 1. Backend: Ingredient-Name Fallback

- [x] 1.1 In `recipe/schemas/items.py` → `resolve_ingredient_name` erweitern: Fallback-Kette `ingredient.name` → `portion.ingredient.name` → `portion.name` → `note` → "Zutat"
- [x] 1.2 Sicherstellen, dass der Shopping-Service (`supply/services/shopping_service.py`) den aufgelösten Namen in der Response nutzt

## 2. Backend: Fallback bei weight_g=0

- [x] 2.1 In `shopping_service.py`: Wenn `portion.weight_g == 0`, statt "0 g" die Darstellung `{quantity} x {portion.name}` liefern (neues Feld `display_text` oder Anpassung der bestehenden Felder)
- [x] 2.2 Schema-Anpassung: `ShoppingListItemOut` um optionales `display_text`-Feld erweitern (oder bestehende Felder `unit`/`total_quantity_g` anpassen)

## 3. Backend: Aufrundung natürlicher Portionen

- [x] 3.1 In `shopping_service.py` Zeile ~192: Bei natürlichen Portionen (Stück, Zehe, Scheibe) Mengen < 1 auf 1 aufrunden

## 4. Frontend: Display-Logik anpassen

- [x] 4.1 In `IngredientList.tsx`: "Unbekannt" durch neuen Fallback-Namen ersetzen (Backend liefert jetzt immer einen Namen)
- [x] 4.2 In `MealEventDetailPage.tsx`: Bei `total_quantity_g == 0` das `display_text`-Feld nutzen statt "0 g"
- [x] 4.3 Zod-Schema synchron halten falls neue Felder hinzukommen

## 5. Test & Verifikation

- [ ] 5.1 Manuell testen: Rezept mit Gewürzen (Pfeffer, Ketchup, Kräuter) in Essensplan → Einkaufsliste prüfen
